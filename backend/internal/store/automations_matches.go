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

const (
	MatchFeedbackLiked    = "LIKED"
	MatchFeedbackDisliked = "DISLIKED"
)

// AutomationMatchedJobRecord is a persisted job match for an automation.
type AutomationMatchedJobRecord struct {
	ID              string
	AutomationID    string
	RunID           *string
	JobID           string
	Title           string
	Company         *string
	Location        *string
	WorkplaceType   *string
	EmploymentType  *string
	ListedAt        *string
	Description     *string
	URL             string
	MatchReason     *string
	Feedback        *string
	FeedbackAt      *time.Time
	NotifiedAt      *time.Time
	FirstMatchedAt  time.Time
}

// AutomationCompanyBanRecord is a user-wide banned company.
type AutomationCompanyBanRecord struct {
	ID                 string
	UserID             string
	CompanyKey         string
	CompanyDisplay     string
	SourceJobID        *string
	SourceAutomationID *string
	CreatedAt          time.Time
}

// AutomationTasteProfileRecord stores LLM-summarized taste signals.
type AutomationTasteProfileRecord struct {
	UserID           string
	LikedSummary     string
	DislikedSummary  string
	UpdatedAt        time.Time
}

// AutomationMatchInput is the payload for upserting a matched job.
type AutomationMatchInput struct {
	JobID          string
	Title          string
	Company        string
	Location       string
	WorkplaceType  string
	EmploymentType string
	ListedAt       string
	Description    string
	URL            string
	MatchReason    string
}

func scanAutomationMatchedJob(row pgx.Row) (*AutomationMatchedJobRecord, error) {
	var rec AutomationMatchedJobRecord
	err := row.Scan(
		&rec.ID, &rec.AutomationID, &rec.RunID, &rec.JobID,
		&rec.Title, &rec.Company, &rec.Location, &rec.WorkplaceType, &rec.EmploymentType,
		&rec.ListedAt, &rec.Description, &rec.URL, &rec.MatchReason,
		&rec.Feedback, &rec.FeedbackAt, &rec.NotifiedAt, &rec.FirstMatchedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

const automationMatchedJobColumns = `
	m.id, m.automation_id, m.run_id, m.job_id, m.title, m.company, m.location, m.workplace_type,
	m.employment_type, m.listed_at, m.description, m.url, m.match_reason,
	m.feedback, m.feedback_at, m.notified_at, m.first_matched_at
`

// UpsertAutomationMatches inserts new matches and returns job IDs that were newly inserted.
func UpsertAutomationMatches(ctx context.Context, pool *pgxpool.Pool, automationID, runID string, matches []AutomationMatchInput) ([]string, error) {
	if len(matches) == 0 {
		return nil, nil
	}
	now := time.Now().UTC()
	newIDs := make([]string, 0, len(matches))
	for _, m := range matches {
		id := "match-" + uuid.NewString()[:12]
		tag, err := pool.Exec(ctx, `
			INSERT INTO automation_matched_jobs (
				id, automation_id, run_id, job_id, title, company, location,
				workplace_type, employment_type, listed_at, description, url,
				match_reason, first_matched_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7,
				$8, $9, $10, $11, $12,
				$13, $14
			)
			ON CONFLICT (automation_id, job_id) DO NOTHING
		`, id, automationID, nullIfEmpty(runID), m.JobID, m.Title,
			nullIfEmpty(m.Company), nullIfEmpty(m.Location),
			nullIfEmpty(m.WorkplaceType), nullIfEmpty(m.EmploymentType),
			nullIfEmpty(m.ListedAt), nullIfEmpty(m.Description), m.URL,
			nullIfEmpty(m.MatchReason), now)
		if err != nil {
			return nil, fmt.Errorf("upsert automation match: %w", err)
		}
		if tag.RowsAffected() > 0 {
			newIDs = append(newIDs, m.JobID)
		}
	}
	return newIDs, nil
}

// MarkAutomationMatchesNotified sets notified_at for newly emailed matches.
func MarkAutomationMatchesNotified(ctx context.Context, pool *pgxpool.Pool, automationID string, jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}
	now := time.Now().UTC()
	_, err := pool.Exec(ctx, `
		UPDATE automation_matched_jobs
		SET notified_at = $3
		WHERE automation_id = $1 AND job_id = ANY($2) AND notified_at IS NULL
	`, automationID, jobIDs, now)
	return err
}

func (p *Postgres) ListAutomationMatches(automationID string, limit, offset int, feedback *string) ([]*AutomationMatchedJobRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT ` + automationMatchedJobColumns + `
		FROM automation_matched_jobs m
		JOIN job_automations a ON a.id = m.automation_id
		WHERE m.automation_id = $1 AND a.user_id = $2
	`
	args := []any{automationID, userID}
	argN := 3
	if feedback != nil {
		switch strings.ToUpper(strings.TrimSpace(*feedback)) {
		case "NONE", "":
			query += fmt.Sprintf(" AND m.feedback IS NULL")
		default:
			query += fmt.Sprintf(" AND m.feedback = $%d", argN)
			args = append(args, strings.ToUpper(strings.TrimSpace(*feedback)))
			argN++
		}
	}
	query += fmt.Sprintf(" ORDER BY m.first_matched_at DESC LIMIT $%d OFFSET $%d", argN, argN+1)
	args = append(args, limit, offset)

	rows, err := p.pool.Query(p.ctx(), query, args...)
	if err != nil {
		return nil, fmt.Errorf("list automation matches: %w", err)
	}
	defer rows.Close()

	out := make([]*AutomationMatchedJobRecord, 0)
	for rows.Next() {
		rec, err := scanAutomationMatchedJob(rows)
		if err != nil {
			return nil, fmt.Errorf("scan automation match: %w", err)
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (p *Postgres) SetAutomationMatchFeedback(automationID, jobID, feedback string) (*AutomationMatchedJobRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	feedback = strings.ToUpper(strings.TrimSpace(feedback))
	var feedbackVal *string
	var feedbackAt *time.Time
	if feedback == MatchFeedbackLiked || feedback == MatchFeedbackDisliked {
		feedbackVal = &feedback
		now := time.Now().UTC()
		feedbackAt = &now
	}

	row := p.pool.QueryRow(p.ctx(), `
		UPDATE automation_matched_jobs m
		SET feedback = $4, feedback_at = $5
		FROM job_automations a
		WHERE m.automation_id = $1 AND m.job_id = $2 AND a.id = m.automation_id AND a.user_id = $3
		RETURNING m.id, m.automation_id, m.run_id, m.job_id, m.title, m.company, m.location, m.workplace_type,
			m.employment_type, m.listed_at, m.description, m.url, m.match_reason,
			m.feedback, m.feedback_at, m.notified_at, m.first_matched_at
	`, automationID, jobID, userID, feedbackVal, feedbackAt)
	rec, err := scanAutomationMatchedJob(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("match not found")
		}
		return nil, fmt.Errorf("set match feedback: %w", err)
	}
	return rec, nil
}

func ListRecentFeedbackExamples(ctx context.Context, pool *pgxpool.Pool, userID string, limit int) (liked, disliked []*AutomationMatchedJobRecord, err error) {
	if limit <= 0 {
		limit = 5
	}
	liked, err = listFeedbackExamples(ctx, pool, userID, MatchFeedbackLiked, limit)
	if err != nil {
		return nil, nil, err
	}
	disliked, err = listFeedbackExamples(ctx, pool, userID, MatchFeedbackDisliked, limit)
	if err != nil {
		return nil, nil, err
	}
	return liked, disliked, nil
}

func listFeedbackExamples(ctx context.Context, pool *pgxpool.Pool, userID, feedback string, limit int) ([]*AutomationMatchedJobRecord, error) {
	rows, err := pool.Query(ctx, `
		SELECT `+automationMatchedJobColumns+`
		FROM automation_matched_jobs m
		JOIN job_automations a ON a.id = m.automation_id
		WHERE a.user_id = $1 AND m.feedback = $2
		ORDER BY m.feedback_at DESC NULLS LAST
		LIMIT $3
	`, userID, feedback, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*AutomationMatchedJobRecord, 0)
	for rows.Next() {
		rec, err := scanAutomationMatchedJob(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func CountUserFeedback(ctx context.Context, pool *pgxpool.Pool, userID string) (int, error) {
	var count int
	err := pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM automation_matched_jobs m
		JOIN job_automations a ON a.id = m.automation_id
		WHERE a.user_id = $1 AND m.feedback IS NOT NULL
	`, userID).Scan(&count)
	return count, err
}

func AutomationMatchedJobToModel(rec *AutomationMatchedJobRecord) *model.AutomationMatchedJob {
	if rec == nil {
		return nil
	}
	out := &model.AutomationMatchedJob{
		JobID:          rec.JobID,
		Title:          rec.Title,
		URL:            rec.URL,
		Company:        rec.Company,
		Location:       rec.Location,
		WorkplaceType:  rec.WorkplaceType,
		EmploymentType: rec.EmploymentType,
		ListedAt:       rec.ListedAt,
		Description:    rec.Description,
		MatchReason:    rec.MatchReason,
		FirstMatchedAt: rec.FirstMatchedAt.UTC().Format(time.RFC3339),
	}
	if rec.RunID != nil {
		out.RunID = rec.RunID
	}
	if rec.Feedback != nil {
		fb := model.AutomationMatchFeedback(*rec.Feedback)
		out.Feedback = &fb
	}
	if rec.FeedbackAt != nil {
		s := rec.FeedbackAt.UTC().Format(time.RFC3339)
		out.FeedbackAt = &s
	}
	return out
}

func nullIfEmpty(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
