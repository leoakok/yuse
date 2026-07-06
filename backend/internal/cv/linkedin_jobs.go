package cv

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
)

// AdminLinkedInJobSearch runs LinkedIn Voyager job search (admin only).
// sessionCookie is ephemeral: used for this request only, never stored or logged.
func (s *Service) AdminLinkedInJobSearch(
	ctx context.Context,
	keywords *string,
	geoID, timeFilter, sessionCookie *string,
	workplaceTypes []model.LinkedInWorkplaceType,
	experienceLevels []model.LinkedInExperienceLevel,
	employmentTypes []model.LinkedInEmploymentType,
) ([]*model.LinkedInJobCard, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}

	params := linkedin.SearchParams{}
	if keywords != nil {
		params.Keywords = *keywords
	}
	if geoID != nil {
		params.GeoID = *geoID
	}
	if timeFilter != nil && *timeFilter != "" {
		params.TimeFilter = *timeFilter
	}
	if sessionCookie != nil {
		params.SessionCookie = *sessionCookie
	}
	for _, value := range workplaceTypes {
		params.WorkplaceTypes = append(params.WorkplaceTypes, string(value))
	}
	for _, value := range experienceLevels {
		params.ExperienceLevels = append(params.ExperienceLevels, string(value))
	}
	for _, value := range employmentTypes {
		params.EmploymentTypes = append(params.EmploymentTypes, string(value))
	}

	results, err := linkedin.SearchJobs(ctx, params)
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
		if j.WorkplaceType != "" {
			card.WorkplaceType = &j.WorkplaceType
		}
		if j.EmploymentType != "" {
			card.EmploymentType = &j.EmploymentType
		}
		if j.ListedAt != "" {
			card.ListedAt = &j.ListedAt
		}
		if j.Description != "" {
			card.Description = &j.Description
		}
		out = append(out, card)
	}
	return out, nil
}
