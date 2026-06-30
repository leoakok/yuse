package store

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
)

// Knowledge dictionary entries are global (platform-wide), not workspace-scoped.

func (p *Postgres) ListKnowledgeEntries(includeDisabled bool) []*model.KnowledgeEntry {
	query := `
		SELECT id, slug, title, category, tags, body, enabled, created_at, updated_at
		FROM knowledge_entries
	`
	if !includeDisabled {
		query += ` WHERE enabled = TRUE`
	}
	query += ` ORDER BY category ASC, title ASC`
	rows, err := p.pool.Query(p.ctx(), query)
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanKnowledgeEntries(rows)
}

func (p *Postgres) GetKnowledgeEntry(id string) (*model.KnowledgeEntry, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, slug, title, category, tags, body, enabled, created_at, updated_at
		FROM knowledge_entries WHERE id = $1
	`, id)
	entry, err := scanKnowledgeEntry(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return entry, err
}

func (p *Postgres) CreateKnowledgeEntry(entry *model.KnowledgeEntry) (*model.KnowledgeEntry, error) {
	now := time.Now().UTC()
	if entry.ID == "" {
		entry.ID = "kb-" + uuid.NewString()[:8]
	}
	if entry.Tags == nil {
		entry.Tags = []string{}
	}
	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO knowledge_entries (id, slug, title, category, tags, body, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, entry.ID, entry.Slug, entry.Title, string(entry.Category), entry.Tags, entry.Body, entry.Enabled, now)
	if err != nil {
		return nil, err
	}
	return p.GetKnowledgeEntry(entry.ID)
}

func (p *Postgres) UpdateKnowledgeEntry(id string, update func(*model.KnowledgeEntry) error) (*model.KnowledgeEntry, error) {
	entry, err := p.GetKnowledgeEntry(id)
	if err != nil {
		return nil, err
	}
	if err := update(entry); err != nil {
		return nil, err
	}
	if entry.Tags == nil {
		entry.Tags = []string{}
	}
	now := time.Now().UTC()
	_, err = p.pool.Exec(p.ctx(), `
		UPDATE knowledge_entries SET
			slug = $2, title = $3, category = $4, tags = $5, body = $6, enabled = $7, updated_at = $8
		WHERE id = $1
	`, entry.ID, entry.Slug, entry.Title, string(entry.Category), entry.Tags, entry.Body, entry.Enabled, now)
	if err != nil {
		return nil, err
	}
	return p.GetKnowledgeEntry(entry.ID)
}

func (p *Postgres) DeleteKnowledgeEntry(id string) error {
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM knowledge_entries WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanKnowledgeEntry(row scannable) (*model.KnowledgeEntry, error) {
	var entry model.KnowledgeEntry
	var category string
	var tags []string
	var createdAt, updatedAt time.Time
	if err := row.Scan(&entry.ID, &entry.Slug, &entry.Title, &category, &tags,
		&entry.Body, &entry.Enabled, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	entry.Category = model.AssistantCategory(strings.ToUpper(strings.TrimSpace(category)))
	if tags == nil {
		tags = []string{}
	}
	entry.Tags = tags
	entry.CreatedAt = formatTime(createdAt)
	entry.UpdatedAt = formatTime(updatedAt)
	return &entry, nil
}

func scanKnowledgeEntries(rows pgx.Rows) []*model.KnowledgeEntry {
	out := make([]*model.KnowledgeEntry, 0)
	for rows.Next() {
		entry, err := scanKnowledgeEntry(rows)
		if err != nil {
			continue
		}
		out = append(out, entry)
	}
	return out
}
