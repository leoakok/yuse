package store

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const DefaultAIMonthlyTokenLimit int64 = 1_000_000

var (
	// ErrAIDisabled is returned when a user account has AI turned off.
	ErrAIDisabled = errors.New("AI is disabled for this account. Ask an admin if you need access.")
	// ErrAILimitReached is returned when the monthly token budget is exhausted.
	ErrAILimitReached = errors.New("AI limit reached for this month. Ask an admin if you need more.")
)

var configuredAIMonthlyTokenLimit atomic.Int64

func init() {
	configuredAIMonthlyTokenLimit.Store(DefaultAIMonthlyTokenLimit)
}

// ConfigureAIMonthlyTokenLimit sets the platform default monthly token budget.
// Call once at server start from config. Zero means unset users are blocked until granted a limit.
func ConfigureAIMonthlyTokenLimit(limit int64) {
	configuredAIMonthlyTokenLimit.Store(limit)
}

// PlatformAIMonthlyTokenLimit returns the configured platform default.
func PlatformAIMonthlyTokenLimit() int64 {
	return configuredAIMonthlyTokenLimit.Load()
}

// CurrentLLMYearMonth returns the UTC year-month key for usage rollups (e.g. "2026-07").
func CurrentLLMYearMonth() string {
	return time.Now().UTC().Format("2006-01")
}

// EffectiveAIMonthlyTokenLimit resolves override vs platform default.
func EffectiveAIMonthlyTokenLimit(override *int64) int64 {
	if override != nil {
		return *override
	}
	return PlatformAIMonthlyTokenLimit()
}

// LLMAccessStatus is the metering snapshot used to gate LLM calls.
type LLMAccessStatus struct {
	AIEnabled       bool
	OverrideLimit   *int64
	TokensUsed      int64
	RequestCount    int64
	EffectiveLimit  int64
}

// EvaluateLLMAccess returns a user-facing error when AI should be blocked.
func EvaluateLLMAccess(status LLMAccessStatus) error {
	if !status.AIEnabled {
		return ErrAIDisabled
	}
	if status.EffectiveLimit <= 0 {
		return ErrAILimitReached
	}
	if status.TokensUsed >= status.EffectiveLimit {
		return ErrAILimitReached
	}
	return nil
}

// GetLLMAccessStatus loads AI settings and current-month usage for a user.
func GetLLMAccessStatus(ctx context.Context, pool *pgxpool.Pool, userID string) (LLMAccessStatus, error) {
	yearMonth := CurrentLLMYearMonth()
	var status LLMAccessStatus
	var override *int64
	err := pool.QueryRow(ctx, `
		SELECT u.ai_enabled,
		       u.ai_monthly_token_limit,
		       COALESCE(m.prompt_tokens, 0) + COALESCE(m.completion_tokens, 0),
		       COALESCE(m.request_count, 0)
		FROM users u
		LEFT JOIN llm_usage_monthly m
		  ON m.user_id = u.id AND m.year_month = $2
		WHERE u.id = $1
	`, userID, yearMonth).Scan(
		&status.AIEnabled,
		&override,
		&status.TokensUsed,
		&status.RequestCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return LLMAccessStatus{}, fmt.Errorf("user not found")
	}
	if err != nil {
		return LLMAccessStatus{}, fmt.Errorf("get llm access: %w", err)
	}
	status.OverrideLimit = override
	status.EffectiveLimit = EffectiveAIMonthlyTokenLimit(override)
	return status, nil
}

// CheckLLMAccessForUser enforces ai_enabled and monthly token budget.
func CheckLLMAccessForUser(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	status, err := GetLLMAccessStatus(ctx, pool, userID)
	if err != nil {
		return err
	}
	return EvaluateLLMAccess(status)
}

// RecordLLMUsage increments the monthly rollup and writes a best-effort event row.
func RecordLLMUsage(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID, feature, model string,
	promptTokens, completionTokens int,
) error {
	if userID == "" {
		return nil
	}
	if promptTokens < 0 {
		promptTokens = 0
	}
	if completionTokens < 0 {
		completionTokens = 0
	}
	yearMonth := CurrentLLMYearMonth()
	now := time.Now().UTC()

	_, err := pool.Exec(ctx, `
		INSERT INTO llm_usage_monthly (
			user_id, year_month, prompt_tokens, completion_tokens, request_count, updated_at
		) VALUES ($1, $2, $3, $4, 1, $5)
		ON CONFLICT (user_id, year_month) DO UPDATE SET
			prompt_tokens = llm_usage_monthly.prompt_tokens + EXCLUDED.prompt_tokens,
			completion_tokens = llm_usage_monthly.completion_tokens + EXCLUDED.completion_tokens,
			request_count = llm_usage_monthly.request_count + 1,
			updated_at = EXCLUDED.updated_at
	`, userID, yearMonth, promptTokens, completionTokens, now)
	if err != nil {
		return fmt.Errorf("record llm usage monthly: %w", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO llm_usage_events (
			id, user_id, feature, model, prompt_tokens, completion_tokens, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, uuid.NewString(), userID, feature, model, promptTokens, completionTokens, now)
	if err != nil {
		// Best-effort: monthly rollup already committed; do not fail the reply.
		return nil
	}
	return nil
}

// PoolUsageMeter records LLM usage against a postgres pool.
type PoolUsageMeter struct {
	Pool *pgxpool.Pool
}

// RecordLLMUsage implements llm.UsageMeter.
func (m PoolUsageMeter) RecordLLMUsage(
	ctx context.Context,
	userID, feature, model string,
	promptTokens, completionTokens int,
) error {
	if m.Pool == nil {
		return nil
	}
	return RecordLLMUsage(ctx, m.Pool, userID, feature, model, promptTokens, completionTokens)
}
