package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
)

// LinkedInApplicationRecord is a synced LinkedIn application row.
type LinkedInApplicationRecord struct {
	ID                 string
	UserID             string
	JobID              string
	ApplicationURN     string
	Title              string
	Company            string
	Location           string
	URL                string
	AppliedAt          *time.Time
	LinkedInStatus     string
	ViewedAt           *time.Time
	ResumeDownloadedAt *time.Time
	RejectedAt         *time.Time
	TrackedJobID       *string
	RawPayload         map[string]any
	LastSyncedAt       time.Time
}

// LinkedInApplicationSyncStats summarizes one user sync run.
type LinkedInApplicationSyncStats struct {
	Synced  int
	Linked  int
	Created int
}

func (p *Postgres) ListLinkedInApplications(limit, offset int) ([]*LinkedInApplicationRecord, error) {
	userID := p.activeUserID()
	if userID == "" {
		return nil, fmt.Errorf("not authenticated")
	}
	return ListLinkedInApplicationsForUser(p.ctx(), p.pool, userID, limit, offset)
}

func ListLinkedInApplicationsForUser(ctx context.Context, pool *pgxpool.Pool, userID string, limit, offset int) ([]*LinkedInApplicationRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := pool.Query(ctx, `
		SELECT id, user_id, job_id, application_urn, title, company, location, url,
		       applied_at, li_status, viewed_at, resume_downloaded_at, rejected_at,
		       tracked_job_id, raw_payload, last_synced_at
		FROM linkedin_applications
		WHERE user_id = $1
		ORDER BY applied_at DESC NULLS LAST, last_synced_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list linkedin applications: %w", err)
	}
	defer rows.Close()
	return scanLinkedInApplications(rows)
}

func ListAppliedJobIDs(ctx context.Context, pool *pgxpool.Pool, userID string) ([]string, error) {
	rows, err := pool.Query(ctx, `
		SELECT job_id FROM linkedin_applications WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list applied job ids: %w", err)
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var jobID string
		if err := rows.Scan(&jobID); err != nil {
			return nil, err
		}
		out = append(out, jobID)
	}
	return out, rows.Err()
}

func UpsertLinkedInApplication(ctx context.Context, pool *pgxpool.Pool, rec *LinkedInApplicationRecord) error {
	if rec == nil {
		return fmt.Errorf("application record is required")
	}
	if rec.ID == "" {
		rec.ID = "liapp-" + uuid.NewString()[:12]
	}
	now := time.Now().UTC()
	rec.LastSyncedAt = now
	raw, _ := json.Marshal(rec.RawPayload)
	_, err := pool.Exec(ctx, `
		INSERT INTO linkedin_applications (
			id, user_id, job_id, application_urn, title, company, location, url,
			applied_at, li_status, viewed_at, resume_downloaded_at, rejected_at,
			tracked_job_id, raw_payload, last_synced_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15::jsonb, $16
		)
		ON CONFLICT (user_id, job_id) DO UPDATE SET
			application_urn = EXCLUDED.application_urn,
			title = EXCLUDED.title,
			company = EXCLUDED.company,
			location = EXCLUDED.location,
			url = EXCLUDED.url,
			applied_at = COALESCE(EXCLUDED.applied_at, linkedin_applications.applied_at),
			li_status = EXCLUDED.li_status,
			viewed_at = COALESCE(EXCLUDED.viewed_at, linkedin_applications.viewed_at),
			resume_downloaded_at = COALESCE(EXCLUDED.resume_downloaded_at, linkedin_applications.resume_downloaded_at),
			rejected_at = COALESCE(EXCLUDED.rejected_at, linkedin_applications.rejected_at),
			tracked_job_id = COALESCE(EXCLUDED.tracked_job_id, linkedin_applications.tracked_job_id),
			raw_payload = EXCLUDED.raw_payload,
			last_synced_at = EXCLUDED.last_synced_at
	`, rec.ID, rec.UserID, rec.JobID, nullableText(rec.ApplicationURN), rec.Title,
		nullableText(rec.Company), nullableText(rec.Location), rec.URL,
		rec.AppliedAt, nullableText(rec.LinkedInStatus), rec.ViewedAt, rec.ResumeDownloadedAt, rec.RejectedAt,
		rec.TrackedJobID, raw, rec.LastSyncedAt)
	if err != nil {
		return fmt.Errorf("upsert linkedin application: %w", err)
	}
	return nil
}

func ListUsersWithLinkedInSession(ctx context.Context, pool *pgxpool.Pool, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := pool.Query(ctx, `
		SELECT user_id
		FROM user_connections
		WHERE provider = $1 AND access_token IS NOT NULL AND TRIM(access_token) <> ''
		ORDER BY updated_at DESC
		LIMIT $2
	`, ProviderLinkedInSession, limit)
	if err != nil {
		return nil, fmt.Errorf("list linkedin session users: %w", err)
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		out = append(out, userID)
	}
	return out, rows.Err()
}

func LinkApplicationToTrackedJob(ctx context.Context, pool *pgxpool.Pool, userID, jobID, trackedJobID string) error {
	_, err := pool.Exec(ctx, `
		UPDATE linkedin_applications
		SET tracked_job_id = $3, last_synced_at = NOW()
		WHERE user_id = $1 AND job_id = $2
	`, userID, jobID, trackedJobID)
	return err
}

func FindTrackedJobIDByLinkedInJobID(ctx context.Context, pool *pgxpool.Pool, workspaceID, jobID string) (string, error) {
	var id string
	err := pool.QueryRow(ctx, `
		SELECT id FROM tracked_jobs
		WHERE workspace_id = $1
		  AND (
		    metadata->>'linkedinJobId' = $2
		    OR metadata->>'linkedin_job_id' = $2
		  )
		LIMIT 1
	`, workspaceID, jobID).Scan(&id)
	if errorsIsNoRows(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return id, nil
}

func CreateTrackedJobFromApplication(ctx context.Context, pool *pgxpool.Pool, workspaceID, userID string, app linkedin.ApplicationCard) (string, bool, error) {
	existing, err := FindTrackedJobIDByLinkedInJobID(ctx, pool, workspaceID, app.JobID)
	if err != nil {
		return "", false, err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	metadata := linkedInApplicationMetadata(app, now)

	if existing != "" {
		if err := mergeLinkedInMetadataIntoTrackedJob(ctx, pool, existing, workspaceID, metadata, app); err != nil {
			return "", false, err
		}
		return existing, false, nil
	}

	id := "job-" + uuid.NewString()[:12]
	status := string(model.JobStatusApplied)
	_, err = pool.Exec(ctx, `
		INSERT INTO tracked_jobs (
			id, workspace_id, url, title, company, status, notes, resume_id, cover_letter,
			metadata, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, '', NULL, '', $7::jsonb, $8, $9::timestamptz, $9::timestamptz)
	`, id, workspaceID, app.URL, app.Title, strings.TrimSpace(app.Company), status, jsonBytes(metadata), userID, now)
	if err != nil {
		return "", false, fmt.Errorf("create tracked job from application: %w", err)
	}
	return id, true, nil
}

func mergeLinkedInMetadataIntoTrackedJob(ctx context.Context, pool *pgxpool.Pool, jobID, workspaceID string, metadata map[string]any, app linkedin.ApplicationCard) error {
	var status string
	var rawMeta []byte
	err := pool.QueryRow(ctx, `
		SELECT status, metadata FROM tracked_jobs WHERE id = $1 AND workspace_id = $2
	`, jobID, workspaceID).Scan(&status, &rawMeta)
	if err != nil {
		return err
	}
	merged := parseJSONMap(rawMeta)
	for k, v := range metadata {
		merged[k] = v
	}
	newStatus := status
	if shouldPromoteToApplied(status) {
		newStatus = string(model.JobStatusApplied)
	}
	if app.RejectedAt != nil && statusRank(status) < statusRank(string(model.JobStatusRejected)) {
		newStatus = string(model.JobStatusRejected)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = pool.Exec(ctx, `
		UPDATE tracked_jobs
		SET metadata = $3::jsonb,
		    status = $4,
		    title = CASE WHEN TRIM(title) = '' THEN $5 ELSE title END,
		    company = CASE WHEN TRIM(company) = '' THEN $6 ELSE company END,
		    url = CASE WHEN TRIM(url) = '' THEN $7 ELSE url END,
		    updated_at = $8::timestamptz
		WHERE id = $1 AND workspace_id = $2
	`, jobID, workspaceID, jsonBytes(merged), newStatus, app.Title, strings.TrimSpace(app.Company), app.URL, now)
	return err
}

func shouldPromoteToApplied(status string) bool {
	return status == "" || status == string(model.JobStatusSaved)
}

func statusRank(status string) int {
	switch model.JobStatus(status) {
	case model.JobStatusSaved:
		return 0
	case model.JobStatusApplied:
		return 1
	case model.JobStatusInterview:
		return 2
	case model.JobStatusOffer:
		return 3
	case model.JobStatusRejected:
		return 4
	default:
		return 0
	}
}

func linkedInApplicationMetadata(app linkedin.ApplicationCard, syncedAt string) map[string]any {
	meta := map[string]any{
		"linkedinJobId":      app.JobID,
		"linkedinStatus":     app.LinkedInStatus,
		"lastLinkedInSyncAt": syncedAt,
	}
	if app.ApplicationURN != "" {
		meta["linkedinApplicationUrn"] = app.ApplicationURN
	}
	if app.ViewedAt != nil {
		meta["linkedinViewedAt"] = app.ViewedAt.UTC().Format(time.RFC3339)
	}
	if app.ResumeDownloadedAt != nil {
		meta["linkedinResumeDownloadedAt"] = app.ResumeDownloadedAt.UTC().Format(time.RFC3339)
	}
	return meta
}

func ApplicationCardToRecord(userID string, card linkedin.ApplicationCard) *LinkedInApplicationRecord {
	return &LinkedInApplicationRecord{
		UserID:             userID,
		JobID:              card.JobID,
		ApplicationURN:     card.ApplicationURN,
		Title:              card.Title,
		Company:            card.Company,
		Location:           card.Location,
		URL:                card.URL,
		AppliedAt:          card.AppliedAt,
		LinkedInStatus:     card.LinkedInStatus,
		ViewedAt:           card.ViewedAt,
		ResumeDownloadedAt: card.ResumeDownloadedAt,
		RejectedAt:         card.RejectedAt,
		RawPayload:         card.RawPayload,
	}
}

func LinkedInApplicationToModel(rec *LinkedInApplicationRecord) *model.LinkedInApplication {
	if rec == nil {
		return nil
	}
	out := &model.LinkedInApplication{
		JobID:        rec.JobID,
		Title:        rec.Title,
		URL:          rec.URL,
		LastSyncedAt: rec.LastSyncedAt.UTC().Format(time.RFC3339),
	}
	if rec.Company != "" {
		out.Company = &rec.Company
	}
	if rec.AppliedAt != nil {
		s := rec.AppliedAt.UTC().Format(time.RFC3339)
		out.AppliedAt = &s
	}
	if rec.LinkedInStatus != "" {
		out.LinkedInStatus = &rec.LinkedInStatus
	}
	if rec.ViewedAt != nil {
		s := rec.ViewedAt.UTC().Format(time.RFC3339)
		out.ViewedAt = &s
	}
	if rec.ResumeDownloadedAt != nil {
		s := rec.ResumeDownloadedAt.UTC().Format(time.RFC3339)
		out.ResumeDownloadedAt = &s
	}
	if rec.RejectedAt != nil {
		s := rec.RejectedAt.UTC().Format(time.RFC3339)
		out.RejectedAt = &s
	}
	if rec.TrackedJobID != nil && *rec.TrackedJobID != "" {
		out.TrackedJobID = rec.TrackedJobID
	}
	return out
}

func WorkspaceIDForUserID(userID string) string {
	return auth.WorkspaceIDForUser(userID)
}

func scanLinkedInApplications(rows pgx.Rows) ([]*LinkedInApplicationRecord, error) {
	out := make([]*LinkedInApplicationRecord, 0)
	for rows.Next() {
		rec, err := scanLinkedInApplicationRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func scanLinkedInApplicationRow(row scannable) (*LinkedInApplicationRecord, error) {
	var rec LinkedInApplicationRecord
	var company, location, urn, liStatus *string
	var raw []byte
	if err := row.Scan(
		&rec.ID, &rec.UserID, &rec.JobID, &urn, &rec.Title, &company, &location, &rec.URL,
		&rec.AppliedAt, &liStatus, &rec.ViewedAt, &rec.ResumeDownloadedAt, &rec.RejectedAt,
		&rec.TrackedJobID, &raw, &rec.LastSyncedAt,
	); err != nil {
		return nil, err
	}
	if urn != nil {
		rec.ApplicationURN = *urn
	}
	if company != nil {
		rec.Company = *company
	}
	if location != nil {
		rec.Location = *location
	}
	if liStatus != nil {
		rec.LinkedInStatus = *liStatus
	}
	rec.RawPayload = parseJSONMap(raw)
	return &rec, nil
}

func nullableText(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func errorsIsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
