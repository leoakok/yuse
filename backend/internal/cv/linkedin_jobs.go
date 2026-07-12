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
	sortBy *model.LinkedInJobSortBy,
	maxResults *int,
	workplaceTypes []model.LinkedInWorkplaceType,
	experienceLevels []model.LinkedInExperienceLevel,
	employmentTypes []model.LinkedInEmploymentType,
	easyApply *bool,
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
	if sortBy != nil {
		params.SortBy = string(*sortBy)
	}
	if maxResults != nil {
		params.MaxResults = *maxResults
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
	if easyApply != nil {
		params.EasyApply = *easyApply
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

// AdminLinkedInGeoSearch resolves place names to LinkedIn geoIds (admin only).
func (s *Service) AdminLinkedInGeoSearch(ctx context.Context, keywords string) ([]*model.LinkedInGeoLocation, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}

	results, err := linkedin.SearchGeoLocations(ctx, keywords)
	if err != nil {
		return nil, err
	}
	out := make([]*model.LinkedInGeoLocation, 0, len(results))
	for _, item := range results {
		out = append(out, &model.LinkedInGeoLocation{
			GeoID: item.GeoID,
			Label: item.Label,
		})
	}
	return out, nil
}
