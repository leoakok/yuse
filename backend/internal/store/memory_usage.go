package store

import (
	"context"
	"sync"
)

// MemoryUsageMeter is an in-memory UsageMeter for tests.
type MemoryUsageMeter struct {
	mu      sync.Mutex
	enabled map[string]bool
	limit   map[string]*int64
	usage   map[string]struct {
		prompt     int64
		completion int64
		requests   int64
	}
	events []MemoryUsageEvent
}

// MemoryUsageEvent is one recorded LLM usage row for assertions.
type MemoryUsageEvent struct {
	UserID           string
	Feature          string
	Model            string
	PromptTokens     int
	CompletionTokens int
}

// NewMemoryUsageMeter creates an empty meter.
func NewMemoryUsageMeter() *MemoryUsageMeter {
	return &MemoryUsageMeter{
		enabled: make(map[string]bool),
		limit:   make(map[string]*int64),
		usage: make(map[string]struct {
			prompt     int64
			completion int64
			requests   int64
		}),
	}
}

// ReserveLLMUsage implements llm.UsageMeter.
func (m *MemoryUsageMeter) ReserveLLMUsage(
	ctx context.Context,
	userID, feature, model string,
	tokens int,
) (func(context.Context, int, int) error, func(context.Context) error, error) {
	_ = ctx
	if userID == "" {
		return nil, nil, nil
	}
	if tokens < 1 {
		tokens = 1
	}
	m.mu.Lock()
	row := m.usage[userID]
	enabled := true
	if v, ok := m.enabled[userID]; ok {
		enabled = v
	}
	override := m.limit[userID]
	limit := EffectiveAIMonthlyTokenLimit(override)
	if !enabled {
		m.mu.Unlock()
		return nil, nil, ErrAIDisabled
	}
	if limit <= 0 || row.prompt+row.completion+int64(tokens) > limit {
		m.mu.Unlock()
		return nil, nil, ErrAILimitReached
	}
	row.prompt += int64(tokens)
	row.requests++
	m.usage[userID] = row
	if _, ok := m.enabled[userID]; !ok {
		m.enabled[userID] = true
	}
	m.mu.Unlock()

	reconcile := func(_ context.Context, promptTokens, completionTokens int) error {
		m.mu.Lock()
		defer m.mu.Unlock()
		row := m.usage[userID]
		row.prompt += int64(promptTokens - tokens)
		row.completion += int64(completionTokens)
		m.usage[userID] = row
		m.events = append(m.events, MemoryUsageEvent{userID, feature, model, promptTokens, completionTokens})
		return nil
	}
	release := func(_ context.Context) error {
		m.mu.Lock()
		defer m.mu.Unlock()
		row := m.usage[userID]
		row.prompt -= int64(tokens)
		row.requests--
		m.usage[userID] = row
		return nil
	}
	return reconcile, release, nil
}

// SetLimits updates AI enabled and optional monthly override for a user.
func (m *MemoryUsageMeter) SetLimits(userID string, aiEnabled bool, monthlyLimit *int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.enabled[userID] = aiEnabled
	if monthlyLimit == nil {
		m.limit[userID] = nil
		return
	}
	v := *monthlyLimit
	m.limit[userID] = &v
}

// Status returns the access snapshot used by EvaluateLLMAccess.
func (m *MemoryUsageMeter) Status(userID string) LLMAccessStatus {
	m.mu.Lock()
	defer m.mu.Unlock()
	enabled := true
	if v, ok := m.enabled[userID]; ok {
		enabled = v
	}
	override := m.limit[userID]
	row := m.usage[userID]
	return LLMAccessStatus{
		AIEnabled:      enabled,
		OverrideLimit:  override,
		TokensUsed:     row.prompt + row.completion,
		RequestCount:   row.requests,
		EffectiveLimit: EffectiveAIMonthlyTokenLimit(override),
	}
}

// Events returns a copy of recorded events.
func (m *MemoryUsageMeter) Events() []MemoryUsageEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]MemoryUsageEvent, len(m.events))
	copy(out, m.events)
	return out
}
