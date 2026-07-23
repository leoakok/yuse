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
	AIEnabled      bool
	OverrideLimit  *int64
	TokensUsed     int64
	RequestCount   int64
	EffectiveLimit int64
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

// ReserveLLMUsage atomically reserves monthly budget before a model call.
func ReserveLLMUsage(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID, feature, model string,
	tokens int,
) (*LLMUsageReservation, error) {
	if userID == "" {
		return nil, nil
	}
	if tokens < 1 {
		tokens = 1
	}
	yearMonth := CurrentLLMYearMonth()
	now := time.Now().UTC()

	var reserved bool
	err := pool.QueryRow(ctx, `
		WITH account AS (
			SELECT id, COALESCE(ai_monthly_token_limit, $4) AS token_limit
			FROM users
			WHERE id = $1 AND ai_enabled
		)
		INSERT INTO llm_usage_monthly (
			user_id, year_month, prompt_tokens, completion_tokens, request_count, updated_at
		)
		SELECT id, $2, $3, 0, 1, $5
		FROM account
		WHERE token_limit > 0 AND $3 <= token_limit
		ON CONFLICT (user_id, year_month) DO UPDATE SET
			prompt_tokens = llm_usage_monthly.prompt_tokens + EXCLUDED.prompt_tokens,
			request_count = llm_usage_monthly.request_count + 1,
			updated_at = EXCLUDED.updated_at
		WHERE llm_usage_monthly.prompt_tokens + llm_usage_monthly.completion_tokens + EXCLUDED.prompt_tokens <= (SELECT token_limit FROM account)
		RETURNING TRUE
	`, userID, yearMonth, tokens, PlatformAIMonthlyTokenLimit(), now).Scan(&reserved)
	if errors.Is(err, pgx.ErrNoRows) {
		// Preserve the disabled-account error when a setting changed after an earlier gate.
		status, statusErr := GetLLMAccessStatus(ctx, pool, userID)
		if statusErr != nil {
			return nil, statusErr
		}
		if accessErr := EvaluateLLMAccess(status); accessErr != nil {
			return nil, accessErr
		}
		return nil, ErrAILimitReached
	}
	if err != nil {
		return nil, fmt.Errorf("reserve llm usage monthly: %w", err)
	}
	return &LLMUsageReservation{
		pool: pool, userID: userID, feature: feature, model: model,
		yearMonth: yearMonth, tokens: tokens,
	}, nil
}

// LLMUsageReservation holds an in-flight monthly budget reservation.
type LLMUsageReservation struct {
	pool      *pgxpool.Pool
	userID    string
	feature   string
	model     string
	yearMonth string
	tokens    int
}

// ReconcileLLMUsage replaces the conservative reservation with actual usage.
func (r *LLMUsageReservation) ReconcileLLMUsage(ctx context.Context, promptTokens, completionTokens int) error {
	if r == nil {
		return nil
	}
	if promptTokens < 0 {
		promptTokens = 0
	}
	if completionTokens < 0 {
		completionTokens = 0
	}
	now := time.Now().UTC()
	_, err := r.pool.Exec(ctx, `
		UPDATE llm_usage_monthly SET
			prompt_tokens = prompt_tokens - $3 + $4,
			completion_tokens = completion_tokens + $5,
			updated_at = $6
		WHERE user_id = $1 AND year_month = $2
	`, r.userID, r.yearMonth, r.tokens, promptTokens, completionTokens, now)
	if err != nil {
		return fmt.Errorf("reconcile llm usage monthly: %w", err)
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO llm_usage_events (
			id, user_id, feature, model, prompt_tokens, completion_tokens, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, uuid.NewString(), r.userID, r.feature, r.model, promptTokens, completionTokens, now)
	if err != nil {
		return nil
	}
	return nil
}

// ReleaseLLMUsage removes a reservation when no model response was received.
func (r *LLMUsageReservation) ReleaseLLMUsage(ctx context.Context) error {
	if r == nil {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE llm_usage_monthly SET
			prompt_tokens = GREATEST(0, prompt_tokens - $3),
			request_count = GREATEST(0, request_count - 1),
			updated_at = $4
		WHERE user_id = $1 AND year_month = $2
	`, r.userID, r.yearMonth, r.tokens, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("release llm usage reservation: %w", err)
	}
	return nil
}

// PoolUsageMeter reserves LLM budget against a postgres pool.
type PoolUsageMeter struct {
	Pool *pgxpool.Pool
}

// ReserveLLMUsage implements llm.UsageMeter.
func (m PoolUsageMeter) ReserveLLMUsage(
	ctx context.Context,
	userID, feature, model string,
	tokens int,
) (func(context.Context, int, int) error, func(context.Context) error, error) {
	if m.Pool == nil {
		return nil, nil, nil
	}
	reservation, err := ReserveLLMUsage(ctx, m.Pool, userID, feature, model, tokens)
	if err != nil {
		return nil, nil, err
	}
	if reservation == nil {
		return nil, nil, nil
	}
	return reservation.ReconcileLLMUsage, reservation.ReleaseLLMUsage, nil
}
