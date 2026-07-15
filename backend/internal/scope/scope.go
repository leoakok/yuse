package scope

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/email"
	"github.com/leo/ai-weekend/backend/internal/ratelimit"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type contextKey struct{}

type SecurityContext struct {
	EmailVerificationRequired bool
	Pool                      *pgxpool.Pool
	AssistantLimiter          *ratelimit.Limiter
	AccountLimiter            *ratelimit.Limiter
	TestEmailLimiter          *ratelimit.Limiter
	Email                     email.Config
	AppOrigin                 string
}

type Value struct {
	Session  store.SessionScope
	CV       *cv.Service
	Postgres *store.Postgres
	Security SecurityContext
}

func With(ctx context.Context, value Value) context.Context {
	return context.WithValue(ctx, contextKey{}, value)
}

func From(ctx context.Context) (Value, bool) {
	v, ok := ctx.Value(contextKey{}).(Value)
	return v, ok
}

func CV(ctx context.Context) *cv.Service {
	if v, ok := From(ctx); ok && v.CV != nil {
		return v.CV
	}
	return nil
}

func Postgres(ctx context.Context) *store.Postgres {
	if v, ok := From(ctx); ok && v.Postgres != nil {
		return v.Postgres
	}
	return nil
}

func Session(ctx context.Context) (store.SessionScope, bool) {
	if v, ok := From(ctx); ok && v.Session.UserID != "" {
		return v.Session, true
	}
	return store.SessionScope{}, false
}

// CheckAssistantAccess enforces per-user assistant rate limits, email verification, and AI budget.
func CheckAssistantAccess(ctx context.Context) error {
	return CheckLLMAccess(ctx)
}

// CheckLLMAccess enforces rate limits, email verification, ai_enabled, and monthly token budget.
func CheckLLMAccess(ctx context.Context) error {
	value, ok := From(ctx)
	if !ok || value.CV == nil {
		return fmt.Errorf("unauthorized")
	}
	userID := value.Session.UserID
	if userID == "" {
		return fmt.Errorf("unauthorized")
	}
	if value.Security.AssistantLimiter != nil {
		key := "assistant:user:" + userID
		if !value.Security.AssistantLimiter.Allow(key) {
			return fmt.Errorf("assistant rate limit exceeded, try again shortly")
		}
	}
	if value.Security.EmailVerificationRequired && value.Security.Pool != nil {
		if err := store.RequireVerifiedEmailForLLM(ctx, value.Security.Pool, userID, true); err != nil {
			return fmt.Errorf("verify your email before using the assistant")
		}
	}
	if value.Security.Pool != nil {
		if err := store.CheckLLMAccessForUser(ctx, value.Security.Pool, userID); err != nil {
			return err
		}
	}
	return nil
}

// CheckAccountSensitiveAction enforces per-user rate limits for password and email changes.
func CheckAccountSensitiveAction(ctx context.Context) error {
	value, ok := From(ctx)
	if !ok || value.Session.UserID == "" {
		return fmt.Errorf("unauthorized")
	}
	if value.Security.AccountLimiter != nil {
		key := "account:user:" + value.Session.UserID
		if !value.Security.AccountLimiter.Allow(key) {
			return fmt.Errorf("too many attempts, try again shortly")
		}
	}
	return nil
}

// CheckAdminTestEmail enforces per-admin test email rate limits.
func CheckAdminTestEmail(ctx context.Context) error {
	value, ok := From(ctx)
	if !ok || value.Session.UserID == "" {
		return fmt.Errorf("unauthorized")
	}
	if value.Security.TestEmailLimiter != nil {
		key := "test-email:admin:" + value.Session.UserID
		if !value.Security.TestEmailLimiter.Allow(key) {
			return fmt.Errorf("test email rate limit exceeded, try again later")
		}
	}
	return nil
}
