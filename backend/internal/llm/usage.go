package llm

import (
	"context"
	"encoding/json"
	"log"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

type usageUserKey struct{}

// UsageMeter atomically reserves budget before a model call.
type UsageMeter interface {
	ReserveLLMUsage(ctx context.Context, userID, feature, model string, tokens int) (
		reconcile func(context.Context, int, int) error,
		release func(context.Context) error,
		err error,
	)
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

// SetUsageMeter attaches the budget meter used around OpenAI calls.
func (s *Service) SetUsageMeter(meter UsageMeter) {
	s.meter = meter
}

func (s *Service) reserveUsage(ctx context.Context, feature, model string, request openai.ChatCompletionRequest) (func(context.Context, int, int) error, func(context.Context) error, error) {
	if s == nil || s.meter == nil || UsageUser(ctx) == "" {
		return nil, nil, nil
	}
	raw, err := json.Marshal(request)
	if err != nil {
		return nil, nil, err
	}
	// A token cannot consume more than its serialized input byte plus protocol overhead.
	// MaxTokens bounds completion usage, making this reservation conservative.
	tokens := len(raw) + request.MaxTokens + 64
	return s.meter.ReserveLLMUsage(ctx, UsageUser(ctx), feature, model, tokens)
}

func reconcileUsage(reconcile func(context.Context, int, int) error, promptTokens, completionTokens int) error {
	if reconcile == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return reconcile(ctx, promptTokens, completionTokens)
}

func releaseUsage(release func(context.Context) error) {
	if release == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := release(ctx); err != nil {
		log.Printf("release llm reservation: %v", err)
	}
}
