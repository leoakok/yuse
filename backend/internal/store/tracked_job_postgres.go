package store

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (p *Postgres) ListTrackedJobs() []*model.TrackedJob {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, workspace_id, url, title, company, status, notes, resume_id, cover_letter,
		       metadata, created_by, created_at, updated_at
		FROM tracked_jobs WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanTrackedJobs(rows)
}

func (p *Postgres) GetTrackedJob(id string) (*model.TrackedJob, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, url, title, company, status, notes, resume_id, cover_letter,
		       metadata, created_by, created_at, updated_at
		FROM tracked_jobs WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	job, err := scanTrackedJob(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return job, err
}

func (p *Postgres) CreateTrackedJob(job *model.TrackedJob) *model.TrackedJob {
	now := time.Now().UTC().Format(time.RFC3339)
	if job.ID == "" {
		job.ID = uuid.NewString()
	}
	if job.WorkspaceID == "" {
		job.WorkspaceID = p.activeWorkspaceID()
	}
	if job.CreatedBy == "" {
		job.CreatedBy = p.activeUserID()
	}
	if job.CreatedAt == "" {
		job.CreatedAt = now
	}
	job.UpdatedAt = now
	if job.Metadata == nil {
		job.Metadata = map[string]any{}
	}
	if job.Status == "" {
		job.Status = model.JobStatusSaved
	}

	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO tracked_jobs (
			id, workspace_id, url, title, company, status, notes, resume_id, cover_letter,
			metadata, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz)
	`, job.ID, job.WorkspaceID, job.URL, job.Title, job.Company, string(job.Status),
		job.Notes, nullableStringPtr(job.ResumeID), job.CoverLetter,
		jsonBytes(job.Metadata), job.CreatedBy, job.CreatedAt, job.UpdatedAt)

	return cloneTrackedJob(job)
}

func (p *Postgres) UpdateTrackedJob(id string, update func(*model.TrackedJob) error) (*model.TrackedJob, error) {
	job, err := p.GetTrackedJob(id)
	if err != nil {
		return nil, err
	}
	if err := update(job); err != nil {
		return nil, err
	}
	job.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	_, err = p.pool.Exec(p.ctx(), `
		UPDATE tracked_jobs SET
			url = $2, title = $3, company = $4, status = $5, notes = $6,
			resume_id = $7, cover_letter = $8, metadata = $9, updated_at = $10::timestamptz
		WHERE id = $1 AND workspace_id = $11
	`, job.ID, job.URL, job.Title, job.Company, string(job.Status), job.Notes,
		nullableStringPtr(job.ResumeID), job.CoverLetter, jsonBytes(job.Metadata),
		job.UpdatedAt, p.activeWorkspaceID())
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (p *Postgres) DeleteTrackedJob(id string) error {
	tag, err := p.pool.Exec(p.ctx(), `
		DELETE FROM tracked_jobs WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func nullableStringPtr(value *string) any {
	if value == nil || *value == "" {
		return nil
	}
	return *value
}

func scanTrackedJob(row scannable) (*model.TrackedJob, error) {
	var job model.TrackedJob
	var status string
	var metadata []byte
	var resumeID *string
	var createdAt, updatedAt time.Time
	if err := row.Scan(&job.ID, &job.WorkspaceID, &job.URL, &job.Title, &job.Company, &status,
		&job.Notes, &resumeID, &job.CoverLetter, &metadata, &job.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	job.Status = model.JobStatus(status)
	job.Metadata = parseJSONMap(metadata)
	job.ResumeID = resumeID
	job.CreatedAt = formatTime(createdAt)
	job.UpdatedAt = formatTime(updatedAt)
	return cloneTrackedJob(&job), nil
}

func scanTrackedJobs(rows pgx.Rows) []*model.TrackedJob {
	out := make([]*model.TrackedJob, 0)
	for rows.Next() {
		var job model.TrackedJob
		var status string
		var metadata []byte
		var resumeID *string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&job.ID, &job.WorkspaceID, &job.URL, &job.Title, &job.Company, &status,
			&job.Notes, &resumeID, &job.CoverLetter, &metadata, &job.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		job.Status = model.JobStatus(status)
		job.Metadata = parseJSONMap(metadata)
		job.ResumeID = resumeID
		job.CreatedAt = formatTime(createdAt)
		job.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneTrackedJob(&job))
	}
	return out
}
