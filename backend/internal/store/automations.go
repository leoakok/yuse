package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

// JobAutomationRecord is the persistence shape for job search automations.
type JobAutomationRecord struct {
	ID               string
	UserID           string
	Name             string
	Enabled          bool
	Keywords         *string
	GeoID            *string
	GeoLabel         *string
	TimeFilter       string
	WorkplaceTypes   []string
	ExperienceLevels []string
	EmploymentTypes  []string
	EasyApply        bool
	SortBy           string
	MaxResults       int
	MatchCriteria    string
	IntervalMinutes  int
	NextRunAt        *time.Time
	LastRunAt        *time.Time
	NotifyEmail      string
	SessionInvalid   bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// AutomationRunRecord is an audit row for a single automation execution.
type AutomationRunRecord struct {
	ID            string
	AutomationID  string
	StartedAt     time.Time
	FinishedAt    *time.Time
	Status        string
	JobsFetched   int
	JobsMatched   int
	JobsEmailed   int
	Error         *string
}

func scanJobAutomation(row pgx.Row) (*JobAutomationRecord, error) {
	var rec JobAutomationRecord
	err := row.Scan(
		&rec.ID, &rec.UserID, &rec.Name, &rec.Enabled,
		&rec.Keywords, &rec.GeoID, &rec.GeoLabel, &rec.TimeFilter,
		&rec.WorkplaceTypes, &rec.ExperienceLevels, &rec.EmploymentTypes,
		&rec.EasyApply, &rec.SortBy, &rec.MaxResults, &rec.MatchCriteria,
		&rec.IntervalMinutes, &rec.NextRunAt, &rec.LastRunAt, &rec.NotifyEmail,
		&rec.SessionInvalid, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

const jobAutomationColumns = `
	id, user_id, name, enabled, keywords, geo_id, geo_label, time_filter,
	workplace_types, experience_levels, employment_types, easy_apply, sort_by,
	max_results, match_criteria, interval_minutes, next_run_at, last_run_at,
	notify_email, session_invalid, created_at, updated_at
`

func (p *Postgres) ListJobAutomations() ([]*JobAutomationRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT `+jobAutomationColumns+`
		FROM job_automations
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list job automations: %w", err)
	}
	defer rows.Close()

	out := make([]*JobAutomationRecord, 0)
	for rows.Next() {
		rec, err := scanJobAutomation(rows)
		if err != nil {
			return nil, fmt.Errorf("scan job automation: %w", err)
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (p *Postgres) GetJobAutomation(id string) (*JobAutomationRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	row := p.pool.QueryRow(p.ctx(), `
		SELECT `+jobAutomationColumns+`
		FROM job_automations
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	rec, err := scanJobAutomation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get job automation: %w", err)
	}
	return rec, nil
}

func GetJobAutomationByID(ctx context.Context, pool *pgxpool.Pool, id string) (*JobAutomationRecord, error) {
	row := pool.QueryRow(ctx, `
		SELECT `+jobAutomationColumns+`
		FROM job_automations
		WHERE id = $1
	`, id)
	rec, err := scanJobAutomation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get job automation: %w", err)
	}
	return rec, nil
}

func (p *Postgres) CreateJobAutomation(rec *JobAutomationRecord) (*JobAutomationRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	now := time.Now().UTC()
	if rec.ID == "" {
		rec.ID = "auto-" + uuid.NewString()[:12]
	}
	rec.UserID = userID
	rec.CreatedAt = now
	rec.UpdatedAt = now
	if rec.NextRunAt == nil && rec.Enabled {
		next := now
		rec.NextRunAt = &next
	}

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO job_automations (
			id, user_id, name, enabled, keywords, geo_id, geo_label, time_filter,
			workplace_types, experience_levels, employment_types, easy_apply, sort_by,
			max_results, match_criteria, interval_minutes, next_run_at, last_run_at,
			notify_email, session_invalid, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18,
			$19, $20, $21, $22
		)
	`, rec.ID, rec.UserID, rec.Name, rec.Enabled, rec.Keywords, rec.GeoID, rec.GeoLabel, rec.TimeFilter,
		rec.WorkplaceTypes, rec.ExperienceLevels, rec.EmploymentTypes, rec.EasyApply, rec.SortBy,
		rec.MaxResults, rec.MatchCriteria, rec.IntervalMinutes, rec.NextRunAt, rec.LastRunAt,
		rec.NotifyEmail, rec.SessionInvalid, rec.CreatedAt, rec.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create job automation: %w", err)
	}
	return rec, nil
}

func (p *Postgres) UpdateJobAutomation(id string, update func(*JobAutomationRecord) error) (*JobAutomationRecord, error) {
	rec, err := p.GetJobAutomation(id)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, nil
	}
	if err := update(rec); err != nil {
		return nil, err
	}
	rec.UpdatedAt = time.Now().UTC()

	_, err = p.pool.Exec(p.ctx(), `
		UPDATE job_automations SET
			name = $3, enabled = $4, keywords = $5, geo_id = $6, geo_label = $7, time_filter = $8,
			workplace_types = $9, experience_levels = $10, employment_types = $11, easy_apply = $12,
			sort_by = $13, max_results = $14, match_criteria = $15, interval_minutes = $16,
			next_run_at = $17, last_run_at = $18, notify_email = $19, session_invalid = $20,
			updated_at = $21
		WHERE id = $1 AND user_id = $2
	`, rec.ID, rec.UserID, rec.Name, rec.Enabled, rec.Keywords, rec.GeoID, rec.GeoLabel, rec.TimeFilter,
		rec.WorkplaceTypes, rec.ExperienceLevels, rec.EmploymentTypes, rec.EasyApply, rec.SortBy,
		rec.MaxResults, rec.MatchCriteria, rec.IntervalMinutes, rec.NextRunAt, rec.LastRunAt,
		rec.NotifyEmail, rec.SessionInvalid, rec.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update job automation: %w", err)
	}
	return rec, nil
}

func (p *Postgres) DeleteJobAutomation(id string) (bool, error) {
	userID := p.activeUserID()
	if userID == "" {
		return false, fmt.Errorf("not authenticated")
	}
	tag, err := p.pool.Exec(p.ctx(), `
		DELETE FROM job_automations WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return false, fmt.Errorf("delete job automation: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (p *Postgres) ListAutomationRuns(automationID string, limit, offset int) ([]*AutomationRunRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT r.id, r.automation_id, r.started_at, r.finished_at, r.status,
			r.jobs_fetched, r.jobs_matched, r.jobs_emailed, r.error
		FROM automation_runs r
		JOIN job_automations a ON a.id = r.automation_id
		WHERE r.automation_id = $1 AND a.user_id = $2
		ORDER BY r.started_at DESC
		LIMIT $3 OFFSET $4
	`, automationID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list automation runs: %w", err)
	}
	defer rows.Close()

	out := make([]*AutomationRunRecord, 0)
	for rows.Next() {
		var run AutomationRunRecord
		if err := rows.Scan(
			&run.ID, &run.AutomationID, &run.StartedAt, &run.FinishedAt, &run.Status,
			&run.JobsFetched, &run.JobsMatched, &run.JobsEmailed, &run.Error,
		); err != nil {
			return nil, fmt.Errorf("scan automation run: %w", err)
		}
		out = append(out, &run)
	}
	return out, rows.Err()
}

func ListDueJobAutomations(ctx context.Context, pool *pgxpool.Pool, limit int) ([]*JobAutomationRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	now := time.Now().UTC()
	rows, err := pool.Query(ctx, `
		SELECT `+jobAutomationColumns+`
		FROM job_automations
		WHERE enabled = TRUE
			AND session_invalid = FALSE
			AND (next_run_at IS NULL OR next_run_at <= $1)
		ORDER BY next_run_at NULLS FIRST
		LIMIT $2
	`, now, limit)
	if err != nil {
		return nil, fmt.Errorf("list due job automations: %w", err)
	}
	defer rows.Close()

	out := make([]*JobAutomationRecord, 0)
	for rows.Next() {
		rec, err := scanJobAutomation(rows)
		if err != nil {
			return nil, fmt.Errorf("scan due automation: %w", err)
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

// ClaimJobAutomationRun bumps next_run_at at the start of a run to avoid double-processing.
func ClaimJobAutomationRun(ctx context.Context, pool *pgxpool.Pool, automationID string, intervalMinutes int) error {
	now := time.Now().UTC()
	next := now.Add(time.Duration(intervalMinutes) * time.Minute)
	_, err := pool.Exec(ctx, `
		UPDATE job_automations
		SET next_run_at = $2, last_run_at = $3, updated_at = $3
		WHERE id = $1 AND enabled = TRUE
	`, automationID, next, now)
	return err
}

func InsertAutomationRun(ctx context.Context, pool *pgxpool.Pool, run *AutomationRunRecord) error {
	if run.ID == "" {
		run.ID = "run-" + uuid.NewString()[:12]
	}
	_, err := pool.Exec(ctx, `
		INSERT INTO automation_runs (
			id, automation_id, started_at, finished_at, status,
			jobs_fetched, jobs_matched, jobs_emailed, error
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, run.ID, run.AutomationID, run.StartedAt, run.FinishedAt, run.Status,
		run.JobsFetched, run.JobsMatched, run.JobsEmailed, run.Error)
	return err
}

func UpdateAutomationRun(ctx context.Context, pool *pgxpool.Pool, run *AutomationRunRecord) error {
	_, err := pool.Exec(ctx, `
		UPDATE automation_runs SET
			finished_at = $2, status = $3, jobs_fetched = $4,
			jobs_matched = $5, jobs_emailed = $6, error = $7
		WHERE id = $1
	`, run.ID, run.FinishedAt, run.Status, run.JobsFetched, run.JobsMatched, run.JobsEmailed, run.Error)
	return err
}

func FilterUnseenJobIDs(ctx context.Context, pool *pgxpool.Pool, automationID string, jobIDs []string) ([]string, error) {
	if len(jobIDs) == 0 {
		return nil, nil
	}
	rows, err := pool.Query(ctx, `
		SELECT job_id FROM automation_seen_jobs
		WHERE automation_id = $1 AND job_id = ANY($2)
	`, automationID, jobIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seen := make(map[string]struct{}, len(jobIDs))
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		seen[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]string, 0, len(jobIDs))
	for _, id := range jobIDs {
		if _, ok := seen[id]; !ok {
			out = append(out, id)
		}
	}
	return out, nil
}

func MarkAutomationJobsSeen(ctx context.Context, pool *pgxpool.Pool, automationID string, jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}
	now := time.Now().UTC()
	batch := &pgx.Batch{}
	for _, jobID := range jobIDs {
		batch.Queue(`
			INSERT INTO automation_seen_jobs (automation_id, job_id, first_seen_at)
			VALUES ($1, $2, $3)
			ON CONFLICT (automation_id, job_id) DO NOTHING
		`, automationID, jobID, now)
	}
	br := pool.SendBatch(ctx, batch)
	defer br.Close()
	for range jobIDs {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func SetAutomationSessionInvalid(ctx context.Context, pool *pgxpool.Pool, automationID string, invalid bool) error {
	_, err := pool.Exec(ctx, `
		UPDATE job_automations SET session_invalid = $2, updated_at = $3
		WHERE id = $1
	`, automationID, invalid, time.Now().UTC())
	return err
}

func SetUserAutomationsSessionInvalid(ctx context.Context, pool *pgxpool.Pool, userID string, invalid bool) error {
	_, err := pool.Exec(ctx, `
		UPDATE job_automations SET session_invalid = $2, updated_at = $3
		WHERE user_id = $1
	`, userID, invalid, time.Now().UTC())
	return err
}

func GetUserEmail(ctx context.Context, pool *pgxpool.Pool, userID string) (string, error) {
	var email string
	err := pool.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, userID).Scan(&email)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(email), nil
}

func JobAutomationRecordToModel(rec *JobAutomationRecord) *model.JobAutomation {
	if rec == nil {
		return nil
	}
	out := &model.JobAutomation{
		ID:              rec.ID,
		Name:            rec.Name,
		Enabled:         rec.Enabled,
		Keywords:        rec.Keywords,
		GeoID:           rec.GeoID,
		GeoLabel:        rec.GeoLabel,
		TimeFilter:      rec.TimeFilter,
		EasyApply:       rec.EasyApply,
		MaxResults:      rec.MaxResults,
		MatchCriteria:   rec.MatchCriteria,
		IntervalMinutes: rec.IntervalMinutes,
		NotifyEmail:     rec.NotifyEmail,
		SessionInvalid:  rec.SessionInvalid,
		CreatedAt:       rec.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:       rec.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if rec.SortBy != "" {
		sortBy := model.LinkedInJobSortBy(rec.SortBy)
		out.SortBy = sortBy
	} else {
		out.SortBy = model.LinkedInJobSortByDateDesc
	}
	for _, v := range rec.WorkplaceTypes {
		out.WorkplaceTypes = append(out.WorkplaceTypes, model.LinkedInWorkplaceType(v))
	}
	for _, v := range rec.ExperienceLevels {
		out.ExperienceLevels = append(out.ExperienceLevels, model.LinkedInExperienceLevel(v))
	}
	for _, v := range rec.EmploymentTypes {
		out.EmploymentTypes = append(out.EmploymentTypes, model.LinkedInEmploymentType(v))
	}
	if rec.NextRunAt != nil {
		s := rec.NextRunAt.UTC().Format(time.RFC3339)
		out.NextRunAt = &s
	}
	if rec.LastRunAt != nil {
		s := rec.LastRunAt.UTC().Format(time.RFC3339)
		out.LastRunAt = &s
	}
	return out
}

func AutomationRunRecordToModel(run *AutomationRunRecord) *model.AutomationRun {
	if run == nil {
		return nil
	}
	out := &model.AutomationRun{
		ID:           run.ID,
		AutomationID: run.AutomationID,
		StartedAt:    run.StartedAt.UTC().Format(time.RFC3339),
		Status:       model.AutomationRunStatus(run.Status),
		JobsFetched:  run.JobsFetched,
		JobsMatched:  run.JobsMatched,
		JobsEmailed:  run.JobsEmailed,
		Error:        run.Error,
	}
	if run.FinishedAt != nil {
		s := run.FinishedAt.UTC().Format(time.RFC3339)
		out.FinishedAt = &s
	}
	return out
}
