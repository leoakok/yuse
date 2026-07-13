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

func (p *Postgres) ListCompanyBans() ([]*AutomationCompanyBanRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, user_id, company_key, company_display, source_job_id, source_automation_id, created_at
		FROM automation_company_bans
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list company bans: %w", err)
	}
	defer rows.Close()

	out := make([]*AutomationCompanyBanRecord, 0)
	for rows.Next() {
		var rec AutomationCompanyBanRecord
		if err := rows.Scan(
			&rec.ID, &rec.UserID, &rec.CompanyKey, &rec.CompanyDisplay,
			&rec.SourceJobID, &rec.SourceAutomationID, &rec.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan company ban: %w", err)
		}
		out = append(out, &rec)
	}
	return out, rows.Err()
}

func (p *Postgres) BanCompany(companyDisplay string, companyKey string, sourceJobID, sourceAutomationID *string) (*AutomationCompanyBanRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	display := strings.TrimSpace(companyDisplay)
	if display == "" {
		return nil, fmt.Errorf("company name is required")
	}
	key := strings.TrimSpace(companyKey)
	if key == "" {
		return nil, fmt.Errorf("company key is required")
	}

	id := "ban-" + uuid.NewString()[:12]
	now := time.Now().UTC()
	row := p.pool.QueryRow(p.ctx(), `
		INSERT INTO automation_company_bans (
			id, user_id, company_key, company_display, source_job_id, source_automation_id, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, company_key) DO UPDATE SET
			company_display = EXCLUDED.company_display
		RETURNING id, user_id, company_key, company_display, source_job_id, source_automation_id, created_at
	`, id, userID, key, display, sourceJobID, sourceAutomationID, now)

	var rec AutomationCompanyBanRecord
	if err := row.Scan(
		&rec.ID, &rec.UserID, &rec.CompanyKey, &rec.CompanyDisplay,
		&rec.SourceJobID, &rec.SourceAutomationID, &rec.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("ban company: %w", err)
	}
	return &rec, nil
}

func (p *Postgres) UnbanCompany(banID string) (bool, error) {
	userID := p.activeUserID()
	if userID == "" {
		return false, fmt.Errorf("not authenticated")
	}
	tag, err := p.pool.Exec(p.ctx(), `
		DELETE FROM automation_company_bans WHERE id = $1 AND user_id = $2
	`, banID, userID)
	if err != nil {
		return false, fmt.Errorf("unban company: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func ListCompanyBansForUser(ctx context.Context, pool *pgxpool.Pool, userID string) ([]*AutomationCompanyBanRecord, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, user_id, company_key, company_display, source_job_id, source_automation_id, created_at
		FROM automation_company_bans
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*AutomationCompanyBanRecord, 0)
	for rows.Next() {
		var rec AutomationCompanyBanRecord
		if err := rows.Scan(
			&rec.ID, &rec.UserID, &rec.CompanyKey, &rec.CompanyDisplay,
			&rec.SourceJobID, &rec.SourceAutomationID, &rec.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, &rec)
	}
	return out, rows.Err()
}

func GetTasteProfile(ctx context.Context, pool *pgxpool.Pool, userID string) (*AutomationTasteProfileRecord, error) {
	row := pool.QueryRow(ctx, `
		SELECT user_id, liked_summary, disliked_summary, updated_at
		FROM automation_taste_profiles
		WHERE user_id = $1
	`, userID)
	var rec AutomationTasteProfileRecord
	err := row.Scan(&rec.UserID, &rec.LikedSummary, &rec.DislikedSummary, &rec.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &AutomationTasteProfileRecord{UserID: userID}, nil
		}
		return nil, err
	}
	return &rec, nil
}

func UpsertTasteProfile(ctx context.Context, pool *pgxpool.Pool, userID, likedSummary, dislikedSummary string) error {
	now := time.Now().UTC()
	_, err := pool.Exec(ctx, `
		INSERT INTO automation_taste_profiles (user_id, liked_summary, disliked_summary, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
			liked_summary = EXCLUDED.liked_summary,
			disliked_summary = EXCLUDED.disliked_summary,
			updated_at = EXCLUDED.updated_at
	`, userID, likedSummary, dislikedSummary, now)
	return err
}

func AutomationCompanyBanToModel(rec *AutomationCompanyBanRecord) *model.AutomationCompanyBan {
	if rec == nil {
		return nil
	}
	return &model.AutomationCompanyBan{
		ID:             rec.ID,
		CompanyDisplay: rec.CompanyDisplay,
		CreatedAt:      rec.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func ListFeedbackJobsForTaste(ctx context.Context, pool *pgxpool.Pool, userID string, feedback string, limit int) ([]*AutomationMatchedJobRecord, error) {
	if limit <= 0 {
		limit = 20
	}
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
