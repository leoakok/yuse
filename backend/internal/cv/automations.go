package cv

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/automation"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func (s *Service) ConfigureAutomationRunner(runner *automation.Runner) {
	s.automationRunner = runner
}

// ListJobAutomations returns automations for the signed-in admin user.
func (s *Service) ListJobAutomations() ([]*model.JobAutomation, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	rows, err := s.store.ListJobAutomations()
	if err != nil {
		return nil, err
	}
	out := make([]*model.JobAutomation, 0, len(rows))
	for _, row := range rows {
		out = append(out, store.JobAutomationRecordToModel(row))
	}
	return out, nil
}

// GetJobAutomation returns one automation (admin only).
func (s *Service) GetJobAutomation(id string) (*model.JobAutomation, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	rec, err := s.store.GetJobAutomation(id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, fmt.Errorf("automation not found")
	}
	return store.JobAutomationRecordToModel(rec), nil
}

// ListAutomationRuns returns recent runs for an automation (admin only).
func (s *Service) ListAutomationRuns(automationID string, limit int) ([]*model.AutomationRun, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	rows, err := s.store.ListAutomationRuns(automationID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*model.AutomationRun, 0, len(rows))
	for _, row := range rows {
		out = append(out, store.AutomationRunRecordToModel(row))
	}
	return out, nil
}

// CreateJobAutomation creates a new automation (admin only).
func (s *Service) CreateJobAutomation(input model.CreateJobAutomationInput) (*model.JobAutomation, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	user := s.store.User()
	if user == nil {
		return nil, ErrForbidden
	}
	rec, err := buildJobAutomationRecord(input, user)
	if err != nil {
		return nil, err
	}
	created, err := s.store.CreateJobAutomation(rec)
	if err != nil {
		return nil, err
	}
	return store.JobAutomationRecordToModel(created), nil
}

// UpdateJobAutomation updates an automation (admin only).
func (s *Service) UpdateJobAutomation(input model.UpdateJobAutomationInput) (*model.JobAutomation, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	updated, err := s.store.UpdateJobAutomation(input.ID, func(rec *store.JobAutomationRecord) error {
		if err := applyJobAutomationUpdate(rec, input); err != nil {
			return err
		}
		user := s.store.User()
		if user == nil {
			return ErrForbidden
		}
		notify, err := accountNotifyEmail(user)
		if err != nil {
			return err
		}
		rec.NotifyEmail = notify
		return nil
	})
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, fmt.Errorf("automation not found")
	}
	return store.JobAutomationRecordToModel(updated), nil
}

// DeleteJobAutomation removes an automation (admin only).
func (s *Service) DeleteJobAutomation(id string) (bool, error) {
	if err := s.requireAdmin(); err != nil {
		return false, err
	}
	return s.store.DeleteJobAutomation(id)
}

// LinkedInSessionStatus reports whether a session cookie is configured (admin only).
func (s *Service) LinkedInSessionStatus() (*model.LinkedInSessionStatus, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	configured, updatedAt, err := s.store.LinkedInSessionConfigured()
	if err != nil {
		return nil, err
	}
	out := &model.LinkedInSessionStatus{Configured: configured}
	if updatedAt != nil {
		s := updatedAt.UTC().Format(time.RFC3339)
		out.UpdatedAt = &s
	}
	return out, nil
}

// SaveLinkedInSession encrypts and stores the LinkedIn cookie (admin only).
func (s *Service) SaveLinkedInSession(cookie string) (*model.LinkedInSessionStatus, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	_, updatedAt, err := s.store.SaveLinkedInSession(strings.TrimSpace(cookie))
	if err != nil {
		return nil, err
	}
	out := &model.LinkedInSessionStatus{Configured: true}
	if updatedAt != nil {
		s := updatedAt.UTC().Format(time.RFC3339)
		out.UpdatedAt = &s
	}
	// Clear session_invalid on all automations when user refreshes cookie.
	if s.automationRunner != nil && s.automationRunner.Pool != nil {
		user := s.store.User()
		if user != nil {
			_ = store.SetUserAutomationsSessionInvalid(context.Background(), s.automationRunner.Pool, user.ID, false)
		}
	}
	return out, nil
}

// ClearLinkedInSession removes the stored cookie (admin only).
func (s *Service) ClearLinkedInSession() (*model.LinkedInSessionStatus, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	if _, err := s.store.ClearLinkedInSession(); err != nil {
		return nil, err
	}
	return &model.LinkedInSessionStatus{Configured: false}, nil
}

// RunJobAutomationNow runs fetch → match → email immediately (admin only).
func (s *Service) RunJobAutomationNow(ctx context.Context, id string) (*model.JobAutomationRunResult, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	if s.automationRunner == nil {
		return nil, fmt.Errorf("automation runner is not configured")
	}
	rec, err := s.store.GetJobAutomation(id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, fmt.Errorf("automation not found")
	}
	outcome, err := s.automationRunner.RunByID(ctx, id)
	if err != nil && outcome == nil {
		return nil, err
	}
	result := &model.JobAutomationRunResult{
		Run:     store.AutomationRunRecordToModel(outcome.Run),
		Matches: linkedInJobsToModel(outcome.Matches),
	}
	return result, err
}

func buildJobAutomationRecord(input model.CreateJobAutomationInput, user *model.User) (*store.JobAutomationRecord, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	criteria := strings.TrimSpace(input.MatchCriteria)
	if criteria == "" {
		return nil, fmt.Errorf("match criteria is required")
	}
	if input.IntervalMinutes <= 0 {
		return nil, fmt.Errorf("interval must be at least 1 minute")
	}
	notify, err := accountNotifyEmail(user)
	if err != nil {
		return nil, err
	}

	rec := &store.JobAutomationRecord{
		Name:            name,
		Enabled:         input.Enabled == nil || *input.Enabled,
		Keywords:        input.Keywords,
		GeoID:           input.GeoID,
		GeoLabel:        input.GeoLabel,
		TimeFilter:      defaultStr(ptrStr(input.TimeFilter), "r86400"),
		EasyApply:       input.EasyApply != nil && *input.EasyApply,
		SortBy:          string(defaultSort(input.SortBy)),
		MaxResults:      defaultInt(input.MaxResults, 100),
		MatchCriteria:   criteria,
		IntervalMinutes: input.IntervalMinutes,
		NotifyEmail:     notify,
	}
	rec.WorkplaceTypes = enumStrings(input.WorkplaceTypes)
	rec.ExperienceLevels = enumStrings(input.ExperienceLevels)
	rec.EmploymentTypes = enumStrings(input.EmploymentTypes)
	return rec, nil
}

func applyJobAutomationUpdate(rec *store.JobAutomationRecord, input model.UpdateJobAutomationInput) error {
	if input.Name != nil {
		rec.Name = strings.TrimSpace(*input.Name)
	}
	if input.Enabled != nil {
		rec.Enabled = *input.Enabled
	}
	if input.Keywords != nil {
		rec.Keywords = input.Keywords
	}
	if input.GeoID != nil {
		rec.GeoID = input.GeoID
	}
	if input.GeoLabel != nil {
		rec.GeoLabel = input.GeoLabel
	}
	if input.TimeFilter != nil {
		rec.TimeFilter = strings.TrimSpace(*input.TimeFilter)
	}
	if input.WorkplaceTypes != nil {
		rec.WorkplaceTypes = enumStrings(input.WorkplaceTypes)
	}
	if input.ExperienceLevels != nil {
		rec.ExperienceLevels = enumStrings(input.ExperienceLevels)
	}
	if input.EmploymentTypes != nil {
		rec.EmploymentTypes = enumStrings(input.EmploymentTypes)
	}
	if input.EasyApply != nil {
		rec.EasyApply = *input.EasyApply
	}
	if input.SortBy != nil {
		rec.SortBy = string(*input.SortBy)
	}
	if input.MaxResults != nil {
		rec.MaxResults = *input.MaxResults
	}
	if input.MatchCriteria != nil {
		rec.MatchCriteria = strings.TrimSpace(*input.MatchCriteria)
	}
	if input.IntervalMinutes != nil {
		rec.IntervalMinutes = *input.IntervalMinutes
	}
	return nil
}

func accountNotifyEmail(user *model.User) (string, error) {
	if user == nil {
		return "", ErrForbidden
	}
	email := strings.TrimSpace(user.Email)
	if email == "" {
		return "", fmt.Errorf("account email is required")
	}
	if !user.EmailVerified {
		return "", fmt.Errorf("verify your account email before using automations")
	}
	return email, nil
}

func linkedInJobsToModel(jobs []linkedin.JobCard) []*model.LinkedInJobCard {
	out := make([]*model.LinkedInJobCard, 0, len(jobs))
	for _, job := range jobs {
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
	return out
}

func enumStrings[T ~string](values []T) []string {
	out := make([]string, 0, len(values))
	for _, v := range values {
		out = append(out, string(v))
	}
	return out
}

func ptrStr(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func defaultStr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func defaultInt(value *int, fallback int) int {
	if value == nil || *value <= 0 {
		return fallback
	}
	return *value
}

func defaultSort(value *model.LinkedInJobSortBy) model.LinkedInJobSortBy {
	if value == nil {
		return model.LinkedInJobSortByDateDesc
	}
	return *value
}
