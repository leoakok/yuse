package store

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (p *Postgres) ListTwinEntries() []*model.TwinEntry {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, workspace_id, type, title, body, metadata, sort_order, created_by, created_at, updated_at
		FROM twin_entries WHERE workspace_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanTwinEntries(rows)
}

func (p *Postgres) GetTwinEntry(id string) (*model.TwinEntry, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, type, title, body, metadata, sort_order, created_by, created_at, updated_at
		FROM twin_entries WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	entry, err := scanTwinEntry(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return entry, err
}

func (p *Postgres) CreateTwinEntry(entry *model.TwinEntry) *model.TwinEntry {
	now := time.Now().UTC().Format(time.RFC3339)
	if entry.ID == "" {
		entry.ID = uuid.NewString()
	}
	if entry.WorkspaceID == "" {
		entry.WorkspaceID = p.activeWorkspaceID()
	}
	if entry.CreatedBy == "" {
		entry.CreatedBy = p.activeUserID()
	}
	if entry.CreatedAt == "" {
		entry.CreatedAt = now
	}
	entry.UpdatedAt = now
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	if entry.SortOrder == 0 {
		entry.SortOrder = p.nextTwinSortOrder()
	}

	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO twin_entries (id, workspace_id, type, title, body, metadata, sort_order, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz)
	`, entry.ID, entry.WorkspaceID, string(entry.Type), entry.Title, entry.Body,
		jsonBytes(entry.Metadata), entry.SortOrder, entry.CreatedBy, entry.CreatedAt, entry.UpdatedAt)

	return cloneTwinEntry(entry)
}

func (p *Postgres) UpdateTwinEntry(id string, update func(*model.TwinEntry) error) (*model.TwinEntry, error) {
	entry, err := p.GetTwinEntry(id)
	if err != nil {
		return nil, err
	}
	if err := update(entry); err != nil {
		return nil, err
	}
	entry.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	_, err = p.pool.Exec(p.ctx(), `
		UPDATE twin_entries SET
			type = $2, title = $3, body = $4, metadata = $5, sort_order = $6, updated_at = $7::timestamptz
		WHERE id = $1 AND workspace_id = $8
	`, entry.ID, string(entry.Type), entry.Title, entry.Body, jsonBytes(entry.Metadata),
		entry.SortOrder, entry.UpdatedAt, p.activeWorkspaceID())
	if err != nil {
		return nil, err
	}
	return entry, nil
}

func (p *Postgres) DeleteTwinEntry(id string) error {
	tag, err := p.pool.Exec(p.ctx(), `
		DELETE FROM twin_entries WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) nextTwinSortOrder() int {
	var max int
	_ = p.pool.QueryRow(p.ctx(), `
		SELECT COALESCE(MAX(sort_order), 0) FROM twin_entries WHERE workspace_id = $1
	`, p.activeWorkspaceID()).Scan(&max)
	return max + 1
}

func scanTwinEntry(row scannable) (*model.TwinEntry, error) {
	var entry model.TwinEntry
	var entryType string
	var metadata []byte
	var createdAt, updatedAt time.Time
	if err := row.Scan(&entry.ID, &entry.WorkspaceID, &entryType, &entry.Title, &entry.Body,
		&metadata, &entry.SortOrder, &entry.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	entry.Type = model.TwinEntryType(entryType)
	entry.Metadata = parseJSONMap(metadata)
	entry.CreatedAt = formatTime(createdAt)
	entry.UpdatedAt = formatTime(updatedAt)
	return cloneTwinEntry(&entry), nil
}

func scanTwinEntries(rows pgx.Rows) []*model.TwinEntry {
	out := make([]*model.TwinEntry, 0)
	for rows.Next() {
		var entry model.TwinEntry
		var entryType string
		var metadata []byte
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&entry.ID, &entry.WorkspaceID, &entryType, &entry.Title, &entry.Body,
			&metadata, &entry.SortOrder, &entry.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		entry.Type = model.TwinEntryType(entryType)
		entry.Metadata = parseJSONMap(metadata)
		entry.CreatedAt = formatTime(createdAt)
		entry.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneTwinEntry(&entry))
	}
	return out
}
