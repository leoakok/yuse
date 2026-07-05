package cv

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
)

// AdminLinkedInJobSearch runs LinkedIn Voyager job search (admin only).
func (s *Service) AdminLinkedInJobSearch(ctx context.Context, keywords string, geoID, timeFilter *string) ([]*model.LinkedInJobCard, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	geo := ""
	if geoID != nil {
		geo = *geoID
	}
	filter := "r7200"
	if timeFilter != nil && *timeFilter != "" {
		filter = *timeFilter
	}
	results, err := linkedin.SearchJobs(ctx, keywords, geo, filter)
	if err != nil {
		return nil, err
	}
	out := make([]*model.LinkedInJobCard, 0, len(results))
	for _, job := range results {
		j := job
		card := &model.LinkedInJobCard{
			JobID: j.JobID,
			Title: j.Title,
			URL:   j.URL,
		}
		if j.Company != "" {
			card.Company = &j.Company
		}
		if j.Location != "" {
			card.Location = &j.Location
		}
		if j.ListedAt != "" {
			card.ListedAt = &j.ListedAt
		}
		out = append(out, card)
	}
	return out, nil
}
