package jobs

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// FilterStats reports how many jobs were removed by each filter stage.
type FilterStats struct {
	TotalBefore    int
	FilteredBanned int
	FilteredApplied int
}

// CandidateFilter removes banned companies and already-applied jobs before matching.
type CandidateFilter struct {
	UserID string
	Pool   *pgxpool.Pool
}

func (f CandidateFilter) Filter(ctx context.Context, cards []linkedin.JobCard) ([]linkedin.JobCard, FilterStats, error) {
	stats := FilterStats{TotalBefore: len(cards)}
	if len(cards) == 0 {
		return cards, stats, nil
	}

	bans, err := store.ListCompanyBansForUser(ctx, f.Pool, f.UserID)
	if err != nil {
		return nil, stats, err
	}
	appliedIDs, err := store.ListAppliedJobIDs(ctx, f.Pool, f.UserID)
	if err != nil {
		return nil, stats, err
	}
	appliedSet := make(map[string]struct{}, len(appliedIDs))
	for _, id := range appliedIDs {
		appliedSet[id] = struct{}{}
	}

	out := make([]linkedin.JobCard, 0, len(cards))
	for _, card := range cards {
		if CompanyMatchesBan(card.Company, bans) {
			stats.FilteredBanned++
			continue
		}
		if _, ok := appliedSet[card.JobID]; ok {
			stats.FilteredApplied++
			continue
		}
		out = append(out, card)
	}
	return out, stats, nil
}
