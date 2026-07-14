package sync

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// ApplicationSyncer syncs LinkedIn applied jobs into the database and job tracker.
type ApplicationSyncer struct {
	Pool *pgxpool.Pool
}

func (s ApplicationSyncer) SyncUserApplications(ctx context.Context, userID string) (store.LinkedInApplicationSyncStats, error) {
	stats := store.LinkedInApplicationSyncStats{}
	if s.Pool == nil {
		return stats, fmt.Errorf("database pool is required")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return stats, fmt.Errorf("user id is required")
	}

	session, err := store.LinkedInSessionCookieForUser(ctx, s.Pool, userID)
	if err != nil {
		return stats, err
	}

	cards, err := linkedin.ListAppliedJobs(ctx, session)
	if err != nil {
		return stats, err
	}

	workspaceID := store.WorkspaceIDForUserID(userID)
	for _, card := range cards {
		rec := store.ApplicationCardToRecord(userID, card)
		trackedID, created, err := store.CreateTrackedJobFromApplication(ctx, s.Pool, workspaceID, userID, card)
		if err != nil {
			return stats, err
		}
		if trackedID != "" {
			rec.TrackedJobID = &trackedID
			stats.Linked++
			if created {
				stats.Created++
			}
		}
		if err := store.UpsertLinkedInApplication(ctx, s.Pool, rec); err != nil {
			return stats, err
		}
		stats.Synced++
	}
	return stats, nil
}

func (s ApplicationSyncer) SyncDueUsers(ctx context.Context, limit int) (int, error) {
	userIDs, err := store.ListUsersWithLinkedInSession(ctx, s.Pool, limit)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, userID := range userIDs {
		if _, err := s.SyncUserApplications(ctx, userID); err != nil {
			continue
		}
		processed++
	}
	return processed, nil
}
