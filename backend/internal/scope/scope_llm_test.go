package scope

import (
	"context"
	"errors"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestCheckLLMAccessRequiresSession(t *testing.T) {
	err := CheckLLMAccess(context.Background())
	if err == nil || err.Error() != "unauthorized" {
		t.Fatalf("got %v", err)
	}
}

func TestAILimitErrorCopy(t *testing.T) {
	err := store.EvaluateLLMAccess(store.LLMAccessStatus{
		AIEnabled:      true,
		EffectiveLimit: 1,
		TokensUsed:     1,
	})
	if !errors.Is(err, store.ErrAILimitReached) {
		t.Fatalf("got %v", err)
	}
	if err.Error() != "AI limit reached for this month. Ask an admin if you need more." {
		t.Fatalf("copy: %q", err.Error())
	}
}
