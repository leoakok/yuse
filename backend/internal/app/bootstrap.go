package app

import (
	"context"
	"fmt"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/db"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/storage"
	"github.com/leo/ai-weekend/backend/internal/store"
	"github.com/leo/ai-weekend/backend/migrations"
)

// Stack wires persistence, MCP tools, and the CV GraphQL service.
type Stack struct {
	Store    store.Store
	CV       *cv.Service
	LLM      *llm.Service
	Tools    *mcp.Registry
	Photos   storage.ProfilePhotoUploader
	cleanup  func()
}

func (s *Stack) Close() {
	if s.cleanup != nil {
		s.cleanup()
	}
}

// Bootstrap loads config, connects storage, and wires the assistant tool registry.
func Bootstrap(ctx context.Context, cfg config.Config) (*Stack, error) {
	if err := cfg.ValidateBootstrap(); err != nil {
		return nil, err
	}

	dataStore, cleanup, err := newStore(ctx, cfg)
	if err != nil {
		return nil, err
	}

	llmSvc := llm.NewService(cfg)
	photos, err := storage.NewProfilePhotoUploader(cfg)
	if err != nil {
		return nil, fmt.Errorf("init profile photo upload: %w", err)
	}
	cvSvc := cv.NewService(dataStore, llmSvc, photos)
	tools := mcp.NewRegistry(cvSvc)
	llmSvc.SetTools(tools)

	return &Stack{
		Store:   dataStore,
		CV:      cvSvc,
		LLM:     llmSvc,
		Tools:   tools,
		Photos:  photos,
		cleanup: cleanup,
	}, nil
}

func newStore(ctx context.Context, cfg config.Config) (store.Store, func(), error) {
	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, nil, fmt.Errorf("connect database: %w", err)
	}
	if err := migrations.Up(ctx, database.Pool); err != nil {
		database.Close()
		return nil, nil, fmt.Errorf("run migrations: %w", err)
	}
	return store.NewPostgres(database.Pool), func() { database.Close() }, nil
}
