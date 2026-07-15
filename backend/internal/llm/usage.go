package llm

import (
	"context"
	"log"
)

type usageUserKey struct{}

// UsageMeter records token usage attributed to a user.
type UsageMeter interface {
	RecordLLMUsage(ctx context.Context, userID, feature, model string, promptTokens, completionTokens int) error
}

// WithUsageUser attributes subsequent LLM usage in ctx to userID.
func WithUsageUser(ctx context.Context, userID string) context.Context {
	if userID == "" {
		return ctx
	}
	return context.WithValue(ctx, usageUserKey{}, userID)
}

// UsageUser returns the attributed user id from ctx, if any.
func UsageUser(ctx context.Context) string {
	if v, ok := ctx.Value(usageUserKey{}).(string); ok {
		return v
	}
	return ""
}

// SetUsageMeter attaches a usage recorder used after OpenAI responses.
func (s *Service) SetUsageMeter(meter UsageMeter) {
	s.meter = meter
}

func (s *Service) recordUsage(ctx context.Context, feature, model string, promptTokens, completionTokens int) {
	if s == nil || s.meter == nil {
		return
	}
	userID := UsageUser(ctx)
	if userID == "" {
		return
	}
	if promptTokens == 0 && completionTokens == 0 {
		return
	}
	if err := s.meter.RecordLLMUsage(ctx, userID, feature, model, promptTokens, completionTokens); err != nil {
		log.Printf("record llm usage: %v", err)
	}
}
