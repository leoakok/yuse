package graph

import (
	"context"
	"fmt"

	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/scope"
)

func requireCV(ctx context.Context) (*cv.Service, error) {
	svc := scope.CV(ctx)
	if svc == nil {
		return nil, fmt.Errorf("unauthorized")
	}
	return svc, nil
}
