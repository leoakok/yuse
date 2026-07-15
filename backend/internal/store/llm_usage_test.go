package store

import (
	"errors"
	"testing"
)

func TestEffectiveAIMonthlyTokenLimit(t *testing.T) {
	t.Cleanup(func() {
		ConfigureAIMonthlyTokenLimit(DefaultAIMonthlyTokenLimit)
	})
	ConfigureAIMonthlyTokenLimit(1_000_000)

	if got := EffectiveAIMonthlyTokenLimit(nil); got != 1_000_000 {
		t.Fatalf("nil override: got %d", got)
	}
	override := int64(50_000)
	if got := EffectiveAIMonthlyTokenLimit(&override); got != 50_000 {
		t.Fatalf("override: got %d", got)
	}
	ConfigureAIMonthlyTokenLimit(0)
	if got := EffectiveAIMonthlyTokenLimit(nil); got != 0 {
		t.Fatalf("platform zero: got %d", got)
	}
}

func TestEvaluateLLMAccess(t *testing.T) {
	t.Cleanup(func() {
		ConfigureAIMonthlyTokenLimit(DefaultAIMonthlyTokenLimit)
	})
	ConfigureAIMonthlyTokenLimit(1000)

	if err := EvaluateLLMAccess(LLMAccessStatus{
		AIEnabled:      true,
		EffectiveLimit: 1000,
		TokensUsed:     100,
	}); err != nil {
		t.Fatalf("under budget: %v", err)
	}

	err := EvaluateLLMAccess(LLMAccessStatus{
		AIEnabled:      false,
		EffectiveLimit: 1000,
		TokensUsed:     0,
	})
	if !errors.Is(err, ErrAIDisabled) {
		t.Fatalf("disabled: got %v", err)
	}

	err = EvaluateLLMAccess(LLMAccessStatus{
		AIEnabled:      true,
		EffectiveLimit: 1000,
		TokensUsed:     1000,
	})
	if !errors.Is(err, ErrAILimitReached) {
		t.Fatalf("at limit: got %v", err)
	}

	err = EvaluateLLMAccess(LLMAccessStatus{
		AIEnabled:      true,
		EffectiveLimit: 0,
		TokensUsed:     0,
	})
	if !errors.Is(err, ErrAILimitReached) {
		t.Fatalf("zero limit: got %v", err)
	}
}

func TestMemoryUsageMeterIncrements(t *testing.T) {
	meter := NewMemoryUsageMeter()
	ctx := t.Context()
	userID := "user-1"

	if err := meter.RecordLLMUsage(ctx, userID, "assistant", "gpt-test", 10, 20); err != nil {
		t.Fatal(err)
	}
	if err := meter.RecordLLMUsage(ctx, userID, "classify", "gpt-test", 5, 5); err != nil {
		t.Fatal(err)
	}

	status := meter.Status(userID)
	if status.TokensUsed != 40 {
		t.Fatalf("tokens used: got %d want 40", status.TokensUsed)
	}
	if status.RequestCount != 2 {
		t.Fatalf("requests: got %d want 2", status.RequestCount)
	}
	if status.AIEnabled != true {
		t.Fatal("expected ai enabled by default")
	}

	meter.SetLimits(userID, false, nil)
	status = meter.Status(userID)
	if err := EvaluateLLMAccess(status); !errors.Is(err, ErrAIDisabled) {
		t.Fatalf("disabled after set: %v", err)
	}

	limit := int64(30)
	meter.SetLimits(userID, true, &limit)
	status = meter.Status(userID)
	if err := EvaluateLLMAccess(status); !errors.Is(err, ErrAILimitReached) {
		t.Fatalf("over custom limit: %v", err)
	}
}
