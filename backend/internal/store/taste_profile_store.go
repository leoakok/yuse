package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TasteProfileStore is the subset of store used by taste profile refresh.
type TasteProfileStore interface {
	GetTasteProfile(ctx context.Context, userID string) (*AutomationTasteProfileRecord, error)
	UpsertTasteProfile(ctx context.Context, userID, likedSummary, dislikedSummary string) error
	CountUserFeedback(ctx context.Context, userID string) (int, error)
	ListFeedbackJobsForTaste(ctx context.Context, userID, feedback string, limit int) ([]*AutomationMatchedJobRecord, error)
}

// PoolTasteStore adapts pgxpool to TasteProfileStore.
type PoolTasteStore struct {
	Pool *pgxpool.Pool
}

func (p PoolTasteStore) GetTasteProfile(ctx context.Context, userID string) (*AutomationTasteProfileRecord, error) {
	return GetTasteProfile(ctx, p.Pool, userID)
}

func (p PoolTasteStore) UpsertTasteProfile(ctx context.Context, userID, likedSummary, dislikedSummary string) error {
	return UpsertTasteProfile(ctx, p.Pool, userID, likedSummary, dislikedSummary)
}

func (p PoolTasteStore) CountUserFeedback(ctx context.Context, userID string) (int, error) {
	return CountUserFeedback(ctx, p.Pool, userID)
}

func (p PoolTasteStore) ListFeedbackJobsForTaste(ctx context.Context, userID, feedback string, limit int) ([]*AutomationMatchedJobRecord, error) {
	return ListFeedbackJobsForTaste(ctx, p.Pool, userID, feedback, limit)
}

// ShouldRefreshTaste returns true when profile is stale or user has few feedback items.
func ShouldRefreshTaste(profile *AutomationTasteProfileRecord, feedbackCount int, staleAfter time.Duration) bool {
	if feedbackCount == 0 {
		return false
	}
	if feedbackCount < 5 {
		return true
	}
	if profile == nil || profile.UpdatedAt.IsZero() {
		return true
	}
	return time.Since(profile.UpdatedAt) > staleAfter
}
