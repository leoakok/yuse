package cv

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/jobs"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	linkedinsync "github.com/leo/ai-weekend/backend/internal/linkedin/sync"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func (s *Service) dataPool() *pgxpool.Pool {
	if s.automationRunner != nil && s.automationRunner.Pool != nil {
		return s.automationRunner.Pool
	}
	if pg, ok := s.store.(*store.Postgres); ok {
		return pg.Pool()
	}
	return nil
}

func (s *Service) activeUserID() string {
	user := s.store.User()
	if user == nil {
		return ""
	}
	return user.ID
}

// ListLinkedInApplications returns synced applications for the signed-in admin.
func (s *Service) ListLinkedInApplications(limit, offset int) ([]*model.LinkedInApplication, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	rows, err := s.store.ListLinkedInApplications(limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]*model.LinkedInApplication, 0, len(rows))
	for _, row := range rows {
		out = append(out, store.LinkedInApplicationToModel(row))
	}
	return out, nil
}

// SyncLinkedInApplicationsNow pulls applied jobs from LinkedIn for the signed-in admin.
func (s *Service) SyncLinkedInApplicationsNow(ctx context.Context) (*model.LinkedInApplicationSyncResult, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	pool := s.dataPool()
	if pool == nil {
		return nil, fmt.Errorf("database is not available")
	}
	userID := s.activeUserID()
	if userID == "" {
		return nil, ErrForbidden
	}
	stats, err := linkedinsync.ApplicationSyncer{Pool: pool}.SyncUserApplications(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &model.LinkedInApplicationSyncResult{
		Synced:  stats.Synced,
		Linked:  stats.Linked,
		Created: stats.Created,
	}, nil
}

// AgentSearchLinkedInJobs searches LinkedIn and pre-filters banned companies and applied jobs.
func (s *Service) AgentSearchLinkedInJobs(ctx context.Context, args map[string]any) (map[string]any, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	pool := s.dataPool()
	if pool == nil {
		return nil, fmt.Errorf("database is not available")
	}
	userID := s.activeUserID()
	if userID == "" {
		return nil, ErrForbidden
	}

	session, err := store.LinkedInSessionCookieForUser(ctx, pool, userID)
	if err != nil {
		return nil, fmt.Errorf("linkedin session is not configured; save your session in Admin Automations")
	}

	params := linkedin.SearchParams{SessionCookie: session}
	if v, ok := args["keywords"].(string); ok {
		params.Keywords = v
	}
	if v, ok := args["geoId"].(string); ok {
		params.GeoID = v
	}
	if v, ok := args["timeFilter"].(string); ok && v != "" {
		params.TimeFilter = v
	} else {
		params.TimeFilter = "r86400"
	}
	if v, ok := args["sortBy"].(string); ok && v != "" {
		params.SortBy = v
	}
	if v, ok := args["maxResults"].(float64); ok && int(v) > 0 {
		params.MaxResults = int(v)
	}
	if v, ok := args["easyApply"].(bool); ok {
		params.EasyApply = v
	}

	results, err := linkedin.SearchJobs(ctx, params)
	if err != nil {
		return nil, err
	}
	totalBefore := len(results)

	filter := jobs.CandidateFilter{UserID: userID, Pool: pool}
	filtered, stats, err := filter.Filter(ctx, results)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"jobs":              jobCardsToAgentPayload(filtered),
		"totalBeforeFilter": totalBefore,
		"filteredApplied":   stats.FilteredApplied,
		"filteredBanned":    stats.FilteredBanned,
	}, nil
}

// AgentListLinkedInApplications returns synced applications for the agent tool.
func (s *Service) AgentListLinkedInApplications(limit, offset int) (map[string]any, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	apps, err := s.ListLinkedInApplications(limit, offset)
	if err != nil {
		return nil, err
	}
	return map[string]any{"applications": apps}, nil
}

func jobCardsToAgentPayload(cards []linkedin.JobCard) []map[string]any {
	out := make([]map[string]any, 0, len(cards))
	for _, card := range cards {
		item := map[string]any{
			"jobId": card.JobID,
			"title": card.Title,
			"url":   card.URL,
		}
		if card.Company != "" {
			item["company"] = card.Company
		}
		if card.Location != "" {
			item["location"] = card.Location
		}
		if card.WorkplaceType != "" {
			item["workplaceType"] = card.WorkplaceType
		}
		if card.EmploymentType != "" {
			item["employmentType"] = card.EmploymentType
		}
		if card.ListedAt != "" {
			item["listedAt"] = card.ListedAt
		}
		if card.Description != "" {
			item["description"] = card.Description
		}
		out = append(out, item)
	}
	return out
}
