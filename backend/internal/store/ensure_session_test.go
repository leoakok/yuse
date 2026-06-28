package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://cvbuilder:cvbuilder@localhost:5432/cvbuilder?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Skipf("postgres unavailable: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("postgres unavailable: %v", err)
	}
	return pool
}

func TestEnsureSessionSyncExistingGoogleUser(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	userID := "google-sync-test-" + time.Now().Format("150405")
	email := userID + "@example.com"
	claims := auth.Claims{
		Sub:       userID,
		Email:     email,
		Name:      "Sync Test",
		GoogleID:  "sync-test",
		Bootstrap: true,
	}

	if _, err := store.EnsureSession(ctx, pool, claims); err != nil {
		t.Fatalf("bootstrap EnsureSession: %v", err)
	}

	claims.Bootstrap = false
	claims.Picture = ""
	if _, err := store.EnsureSession(ctx, pool, claims); err != nil {
		t.Fatalf("sync EnsureSession: %v", err)
	}
}
