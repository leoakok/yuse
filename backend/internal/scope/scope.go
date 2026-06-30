package scope

import (
	"context"

	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type contextKey struct{}

type Value struct {
	Session store.SessionScope
	CV      *cv.Service
	Postgres *store.Postgres
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
