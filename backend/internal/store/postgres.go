package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

type Postgres struct {
	pool    *pgxpool.Pool
	session SessionScope
}

func NewPostgres(pool *pgxpool.Pool) *Postgres {
	return &Postgres{pool: pool}
}

func (p *Postgres) Pool() *pgxpool.Pool {
	return p.pool
}

func (p *Postgres) WithSession(session SessionScope) *Postgres {
	return &Postgres{pool: p.pool, session: session}
}

func (p *Postgres) activeUserID() string {
	return p.session.UserID
}

func (p *Postgres) activeWorkspaceID() string {
	return p.session.WorkspaceID
}

func (p *Postgres) activeThreadID() string {
	return p.session.ThreadID
}

func (p *Postgres) ctx() context.Context {
	return context.Background()
}

func formatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func parseJSONMap(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil || m == nil {
		return map[string]any{}
	}
	return m
}

func jsonBytes(m map[string]any) []byte {
	if m == nil {
		m = map[string]any{}
	}
	raw, _ := json.Marshal(m)
	return raw
}

func (p *Postgres) User() *model.User {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, email, display_name, avatar_url, role, created_at, updated_at
		FROM users WHERE id = $1
	`, p.activeUserID())
	u, err := scanUser(row)
	if err != nil {
		return nil
	}
	return u
}

func (p *Postgres) Workspace() *model.Workspace {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, name, slug, owner_id, plan, created_at, updated_at
		FROM workspaces WHERE id = $1
	`, p.activeWorkspaceID())
	w, err := scanWorkspace(row)
	if err != nil {
		return nil
	}
	return w
}

func (p *Postgres) Thread() *model.AssistantThread {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, created_at, updated_at
		FROM assistant_threads WHERE id = $1
	`, p.activeThreadID())
	t, err := scanThread(row)
	if err != nil {
		return nil
	}
	return t
}

func (p *Postgres) threadInWorkspace(threadID string) bool {
	var workspaceID string
	err := p.pool.QueryRow(p.ctx(), `
		SELECT workspace_id FROM assistant_threads WHERE id = $1
	`, threadID).Scan(&workspaceID)
	return err == nil && workspaceID == p.activeWorkspaceID()
}

func (p *Postgres) ListAssistantThreads() []*model.AssistantThread {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT
			t.id,
			t.workspace_id,
			t.created_at,
			t.updated_at,
			COALESCE((
				SELECT LEFT(m.content, 80)
				FROM assistant_messages m
				WHERE m.thread_id = t.id AND m.role = 'USER'
				ORDER BY m.created_at DESC
				LIMIT 1
			), '') AS preview
		FROM assistant_threads t
		WHERE t.workspace_id = $1
		ORDER BY t.updated_at DESC
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanThreadsWithPreview(rows)
}

func (p *Postgres) GetAssistantThread(id string) (*model.AssistantThread, error) {
	if !p.threadInWorkspace(id) {
		return nil, ErrNotFound
	}
	row := p.pool.QueryRow(p.ctx(), `
		SELECT
			t.id,
			t.workspace_id,
			t.created_at,
			t.updated_at,
			COALESCE((
				SELECT LEFT(m.content, 80)
				FROM assistant_messages m
				WHERE m.thread_id = t.id AND m.role = 'USER'
				ORDER BY m.created_at DESC
				LIMIT 1
			), '') AS preview
		FROM assistant_threads t
		WHERE t.id = $1
	`, id)
	t, err := scanThreadWithPreview(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func (p *Postgres) CreateAssistantThread() (*model.AssistantThread, error) {
	id := "thread-" + uuid.NewString()[:8]
	now := time.Now().UTC()
	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO assistant_threads (id, workspace_id, created_at, updated_at)
		VALUES ($1, $2, $3, $3)
	`, id, p.activeWorkspaceID(), now)
	if err != nil {
		return nil, err
	}
	return &model.AssistantThread{
		ID:          id,
		WorkspaceID: p.activeWorkspaceID(),
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
		Preview:     strPtr(""),
	}, nil
}

func (p *Postgres) DeleteAssistantThread(id string) error {
	if !p.threadInWorkspace(id) {
		return ErrNotFound
	}
	tx, err := p.pool.Begin(p.ctx())
	if err != nil {
		return err
	}
	defer tx.Rollback(p.ctx())

	if _, err := tx.Exec(p.ctx(), `
		DELETE FROM assistant_action_logs
		WHERE message_id IN (SELECT id FROM assistant_messages WHERE thread_id = $1)
	`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(p.ctx(), `DELETE FROM assistant_messages WHERE thread_id = $1`, id); err != nil {
		return err
	}
	tag, err := tx.Exec(p.ctx(), `
		DELETE FROM assistant_threads WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return tx.Commit(p.ctx())
}

func (p *Postgres) ListThemes() []*model.CvTheme {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, name, slug, is_system, config FROM cv_themes ORDER BY name
	`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanThemes(rows)
}

func (p *Postgres) GetTheme(id string) (*model.CvTheme, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, name, slug, is_system, config FROM cv_themes WHERE id = $1
	`, id)
	t, err := scanTheme(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (p *Postgres) ListResumes() []*model.Resume {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at
		FROM resumes WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanResumes(rows)
}

func (p *Postgres) GetResume(id string) (*model.Resume, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at
		FROM resumes WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	r, err := scanResume(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return r, err
}

func (p *Postgres) SaveResume(resume *model.Resume) {
	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO resumes (id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			contact_profile_id = EXCLUDED.contact_profile_id,
			updated_at = EXCLUDED.updated_at
	`, resume.ID, resume.WorkspaceID, resume.Title, resume.ContactProfileID,
		resume.CreatedBy, resume.CreatedAt, resume.UpdatedAt)
}

func (p *Postgres) ListSections(sectionType *model.SectionType) []*model.Section {
	query := `
		SELECT id, workspace_id, type, title, description, created_by, created_at, updated_at
		FROM sections WHERE workspace_id = $1`
	args := []any{p.activeWorkspaceID()}
	if sectionType != nil {
		query += ` AND type = $2`
		args = append(args, string(*sectionType))
	}
	query += ` ORDER BY title`
	rows, err := p.pool.Query(p.ctx(), query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanSections(rows)
}

func (p *Postgres) GetSection(id string) (*model.Section, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, type, title, description, created_by, created_at, updated_at
		FROM sections WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	s, err := scanSection(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

func (p *Postgres) ListSectionItems(sectionType *model.SectionType) []*model.SectionItem {
	query := `
		SELECT id, workspace_id, type, headline, body, metadata, created_by, created_at, updated_at
		FROM section_items WHERE workspace_id = $1`
	args := []any{p.activeWorkspaceID()}
	if sectionType != nil {
		query += ` AND type = $2`
		args = append(args, string(*sectionType))
	}
	query += ` ORDER BY headline`
	rows, err := p.pool.Query(p.ctx(), query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	items := scanSectionItems(rows)
	for _, item := range items {
		withDefaultShowInPreview(item)
	}
	return items
}

func (p *Postgres) GetSectionItem(id string) (*model.SectionItem, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, type, headline, body, metadata, created_by, created_at, updated_at
		FROM section_items WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	item, err := scanSectionItem(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return withDefaultShowInPreview(item), err
}

func (p *Postgres) SaveSectionItem(item *model.SectionItem) {
	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO section_items (id, workspace_id, type, headline, body, metadata, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
		ON CONFLICT (id) DO UPDATE SET
			headline = EXCLUDED.headline,
			body = EXCLUDED.body,
			metadata = EXCLUDED.metadata,
			updated_at = EXCLUDED.updated_at
	`, item.ID, item.WorkspaceID, string(item.Type), item.Headline, item.Body,
		jsonBytes(item.Metadata), item.CreatedBy, item.CreatedAt, item.UpdatedAt)
}

func (p *Postgres) ListContactProfiles() []*model.ContactProfile {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github, photo_url, linkedin_photo_url, github_photo_url, created_at, updated_at
		FROM contact_profiles WHERE workspace_id = $1
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanContactProfiles(rows)
}

func (p *Postgres) GetContactProfile(id string) (*model.ContactProfile, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github, photo_url, linkedin_photo_url, github_photo_url, created_at, updated_at
		FROM contact_profiles WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	cp, err := scanContactProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return cp, err
}

func (p *Postgres) UpdateContactProfile(
	resumeID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL, linkedinPhotoURL, githubPhotoURL *string,
) (*model.ResumeWithContent, error) {
	ctx := p.ctx()
	resume, err := p.GetResume(resumeID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	var profile *model.ContactProfile

	if resume.ContactProfileID != nil {
		profile, _ = p.GetContactProfile(*resume.ContactProfileID)
	}

	if profile == nil {
		name := "Your name"
		if fullName != nil {
			if trimmed := strings.TrimSpace(*fullName); trimmed != "" {
				name = trimmed
			}
		}
		id := uuid.NewString()
		profile = &model.ContactProfile{
			ID:          id,
			WorkspaceID: resume.WorkspaceID,
			FullName:    name,
			CreatedAt:   formatTime(now),
			UpdatedAt:   formatTime(now),
		}
		resume.ContactProfileID = &id
	}

	if fullName != nil {
		if trimmed := strings.TrimSpace(*fullName); trimmed != "" {
			profile.FullName = trimmed
		}
	}
	if headline != nil {
		profile.Headline = trimmedStringPtr(*headline)
	}
	if email != nil {
		profile.Email = trimmedStringPtr(*email)
	}
	if phone != nil {
		profile.Phone = trimmedStringPtr(*phone)
	}
	if location != nil {
		profile.Location = trimmedStringPtr(*location)
	}
	if website != nil {
		profile.Website = trimmedStringPtr(*website)
	}
	if linkedIn != nil {
		profile.LinkedIn = trimmedStringPtr(*linkedIn)
	}
	if github != nil {
		profile.Github = trimmedStringPtr(*github)
	}
	if photoURL != nil {
		if trimmed := strings.TrimSpace(*photoURL); trimmed == "" {
			profile.PhotoURL = nil
		} else {
			profile.PhotoURL = &trimmed
		}
	}
	if linkedinPhotoURL != nil {
		profile.LinkedinPhotoURL = trimmedStringPtr(*linkedinPhotoURL)
	}
	if githubPhotoURL != nil {
		profile.GithubPhotoURL = trimmedStringPtr(*githubPhotoURL)
	}
	profile.UpdatedAt = formatTime(now)

	createdAt := now
	if profile.CreatedAt != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, profile.CreatedAt); parseErr == nil {
			createdAt = parsed.UTC()
		}
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO contact_profiles (id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github, photo_url, linkedin_photo_url, github_photo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			headline = EXCLUDED.headline,
			email = EXCLUDED.email,
			phone = EXCLUDED.phone,
			location = EXCLUDED.location,
			website = EXCLUDED.website,
			linked_in = EXCLUDED.linked_in,
			github = EXCLUDED.github,
			photo_url = EXCLUDED.photo_url,
			linkedin_photo_url = EXCLUDED.linkedin_photo_url,
			github_photo_url = EXCLUDED.github_photo_url,
			updated_at = EXCLUDED.updated_at
	`, profile.ID, profile.WorkspaceID, profile.FullName, profile.Headline, profile.Email,
		profile.Phone, profile.Location, profile.Website, profile.LinkedIn, profile.Github, profile.PhotoURL,
		profile.LinkedinPhotoURL, profile.GithubPhotoURL,
		createdAt, now)
	if err != nil {
		return nil, fmt.Errorf("save contact profile: %w", err)
	}

	resume.UpdatedAt = formatTime(now)
	_, err = tx.Exec(ctx, `
		UPDATE resumes SET contact_profile_id = $1, updated_at = $2 WHERE id = $3 AND workspace_id = $4
	`, resume.ContactProfileID, now, resume.ID, resume.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("link contact profile: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.ResumeWithContent(resumeID)
}

func (p *Postgres) GetResumeSettings(resumeID string) *model.ResumeSettings {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
			contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
			page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, locale
		FROM resume_settings WHERE resume_id = $1
	`, resumeID)
	s, err := scanResumeSettings(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultResumeSettings(resumeID)
	}
	if err != nil {
		return defaultResumeSettings(resumeID)
	}
	return s
}

func (p *Postgres) UpdateResumeSettings(resumeID string, update func(*model.ResumeSettings)) (*model.ResumeSettings, error) {
	if _, err := p.GetResume(resumeID); err != nil {
		return nil, err
	}

	settings := p.GetResumeSettings(resumeID)
	settings = cloneResumeSettings(settings)
	update(settings)

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO resume_settings (
			resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
			contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
			page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, locale
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (resume_id) DO UPDATE SET
			theme_id = EXCLUDED.theme_id,
			font_size = EXCLUDED.font_size,
			contact_name_font_size = EXCLUDED.contact_name_font_size,
			contact_headline_font_size = EXCLUDED.contact_headline_font_size,
			contact_details_font_size = EXCLUDED.contact_details_font_size,
			section_title_font_size = EXCLUDED.section_title_font_size,
			item_title_font_size = EXCLUDED.item_title_font_size,
			item_meta_font_size = EXCLUDED.item_meta_font_size,
			page_format = EXCLUDED.page_format,
			margin_horizontal_mm = EXCLUDED.margin_horizontal_mm,
			margin_vertical_mm = EXCLUDED.margin_vertical_mm,
			show_photo = EXCLUDED.show_photo,
			item_title_layout = EXCLUDED.item_title_layout,
			locale = EXCLUDED.locale
	`, settings.ResumeID, settings.ThemeID, string(settings.FontSize),
		string(settings.ContactNameFontSize), string(settings.ContactHeadlineFontSize),
		string(settings.ContactDetailsFontSize), string(settings.SectionTitleFontSize),
		string(settings.ItemTitleFontSize), string(settings.ItemMetaFontSize),
		string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, string(settings.ItemTitleLayout), settings.Locale)
	if err != nil {
		return nil, fmt.Errorf("update resume settings: %w", err)
	}
	return cloneResumeSettings(settings), nil
}

func (p *Postgres) itemShowInPreview(resumeID, sectionID, sectionItemID string) bool {
	var show bool
	err := p.pool.QueryRow(p.ctx(), `
		SELECT show_in_preview FROM resume_item_visibility
		WHERE resume_id = $1 AND section_id = $2 AND section_item_id = $3
	`, resumeID, sectionID, sectionItemID).Scan(&show)
	if errors.Is(err, pgx.ErrNoRows) {
		return false
	}
	return show
}

func (p *Postgres) UpdateResumeSectionItemVisibility(
	resumeID, sectionID, sectionItemID string,
	showInPreview bool,
) (*model.ResumeWithContent, error) {
	if _, err := p.GetResume(resumeID); err != nil {
		return nil, err
	}
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}
	if _, err := p.GetSectionItem(sectionItemID); err != nil {
		return nil, err
	}

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO resume_item_visibility (resume_id, section_id, section_item_id, show_in_preview)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (resume_id, section_id, section_item_id) DO UPDATE SET
			show_in_preview = EXCLUDED.show_in_preview
	`, resumeID, sectionID, sectionItemID, showInPreview)
	if err != nil {
		return nil, fmt.Errorf("update visibility: %w", err)
	}
	return p.ResumeWithContent(resumeID)
}

func (p *Postgres) AddResumeSectionItem(
	resumeID, sectionID, headline, body string,
	metadata map[string]any,
) (*model.ResumeWithContent, error) {
	ctx := p.ctx()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var linked bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM resume_sections WHERE resume_id = $1 AND section_id = $2
		)
	`, resumeID, sectionID).Scan(&linked); err != nil {
		return nil, err
	}
	if !linked {
		if _, err := p.GetResume(resumeID); err != nil {
			return nil, err
		}
		if _, err := p.getSectionTx(ctx, tx, sectionID); err != nil {
			return nil, err
		}
		var maxSort int
		_ = tx.QueryRow(ctx, `
			SELECT COALESCE(MAX(sort_order), -1) FROM resume_sections WHERE resume_id = $1
		`, resumeID).Scan(&maxSort)
		_, err = tx.Exec(ctx, `
			INSERT INTO resume_sections (resume_id, section_id, sort_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (resume_id, section_id) DO NOTHING
		`, resumeID, sectionID, maxSort+1)
		if err != nil {
			return nil, fmt.Errorf("link section to resume: %w", err)
		}
		linked = true
	}
	if !linked {
		return nil, ErrNotFound
	}

	section, err := p.getSectionTx(ctx, tx, sectionID)
	if err != nil {
		return nil, err
	}

	trimmedHeadline := strings.TrimSpace(headline)
	if trimmedHeadline == "" {
		trimmedHeadline = defaultSectionItemHeadline(section.Type)
	}

	now := time.Now().UTC()
	itemID := uuid.NewString()
	itemMetadata := map[string]any{}
	if metadata != nil {
		for k, v := range metadata {
			if v != nil {
				itemMetadata[k] = v
			}
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO section_items (id, workspace_id, type, headline, body, metadata, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, itemID, p.activeWorkspaceID(), string(section.Type), trimmedHeadline, strings.TrimSpace(body),
		jsonBytes(itemMetadata), p.activeUserID(), now)
	if err != nil {
		return nil, err
	}

	var maxOrder int
	_ = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(sort_order), -1) FROM section_item_links WHERE section_id = $1
	`, sectionID).Scan(&maxOrder)

	_, err = tx.Exec(ctx, `
		INSERT INTO section_item_links (section_id, section_item_id, sort_order)
		VALUES ($1, $2, $3)
	`, sectionID, itemID, maxOrder+1)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `UPDATE resumes SET updated_at = $2 WHERE id = $1`, resumeID, now)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE sections SET updated_at = $2 WHERE id = $1`, sectionID, now)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO resume_item_visibility (resume_id, section_id, section_item_id, show_in_preview)
		VALUES ($1, $2, $3, true)
		ON CONFLICT (resume_id, section_id, section_item_id) DO UPDATE SET show_in_preview = true
	`, resumeID, sectionID, itemID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO resume_item_visibility (resume_id, section_id, section_item_id, show_in_preview)
		SELECT rs.resume_id, $2, $3, false
		FROM resume_sections rs
		WHERE rs.section_id = $2 AND rs.resume_id <> $1
		ON CONFLICT (resume_id, section_id, section_item_id) DO UPDATE SET show_in_preview = EXCLUDED.show_in_preview
	`, resumeID, sectionID, itemID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.ResumeWithContent(resumeID)
}

func (p *Postgres) UpdateResumeSectionItem(
	resumeID, sectionID, sectionItemID string,
	headline, body *string,
	metadata map[string]any,
) (*model.ResumeWithContent, error) {
	ctx := p.ctx()
	if _, err := p.GetResume(resumeID); err != nil {
		return nil, err
	}
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}

	var linked bool
	if err := p.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM section_item_links WHERE section_id = $1 AND section_item_id = $2
		)
	`, sectionID, sectionItemID).Scan(&linked); err != nil || !linked {
		return nil, ErrNotFound
	}

	item, err := p.GetSectionItem(sectionItemID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if headline != nil {
		item.Headline = strings.TrimSpace(*headline)
	}
	if body != nil {
		item.Body = strings.TrimSpace(*body)
	}
	if metadata != nil {
		item.Metadata = mergeMetadata(item.Metadata, metadata)
	}
	item.UpdatedAt = formatTime(now)

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		UPDATE section_items SET headline = $2, body = $3, metadata = $4, updated_at = $5
		WHERE id = $1
	`, item.ID, item.Headline, item.Body, jsonBytes(item.Metadata), now)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE resumes SET updated_at = $2 WHERE id = $1`, resumeID, now)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE sections SET updated_at = $2 WHERE id = $1`, sectionID, now)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.ResumeWithContent(resumeID)
}

func (p *Postgres) DeleteSectionItem(sectionItemID string) error {
	if _, err := p.GetSectionItem(sectionItemID); err != nil {
		return err
	}

	ctx := p.ctx()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `DELETE FROM resume_item_visibility WHERE section_item_id = $1`, sectionItemID); err != nil {
		return fmt.Errorf("delete item visibility: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM section_item_links WHERE section_item_id = $1`, sectionItemID); err != nil {
		return fmt.Errorf("delete item links: %w", err)
	}
	tag, err := tx.Exec(ctx, `
		DELETE FROM section_items WHERE id = $1 AND workspace_id = $2
	`, sectionItemID, p.activeWorkspaceID())
	if err != nil {
		return fmt.Errorf("delete section item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return tx.Commit(ctx)
}

func (p *Postgres) ResumeWithContent(resumeID string) (*model.ResumeWithContent, error) {
	resume, err := p.GetResume(resumeID)
	if err != nil {
		return nil, err
	}

	settings := p.GetResumeSettings(resumeID)
	theme, _ := p.GetTheme(settings.ThemeID)
	if theme == nil {
		themes := p.ListThemes()
		if len(themes) > 1 {
			theme = themes[1]
		}
	}

	var contact *model.ContactProfile
	if resume.ContactProfileID != nil {
		contact, _ = p.GetContactProfile(*resume.ContactProfileID)
	}

	rows, err := p.pool.Query(p.ctx(), `
		SELECT rs.section_id, rs.sort_order
		FROM resume_sections rs
		JOIN sections s ON s.id = rs.section_id
		WHERE rs.resume_id = $1
		ORDER BY rs.sort_order
	`, resumeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sectionsWithItems := make([]*model.SectionWithItems, 0)
	for rows.Next() {
		var sectionID string
		var sortOrder int
		if err := rows.Scan(&sectionID, &sortOrder); err != nil {
			return nil, err
		}
		section, err := p.GetSection(sectionID)
		if err != nil {
			continue
		}
		items, err := p.sectionItemsForSectionWithVisibility(resumeID, sectionID)
		if err != nil {
			return nil, err
		}
		sectionsWithItems = append(sectionsWithItems, &model.SectionWithItems{
			Section: section,
			Items:   items,
		})
	}

	return &model.ResumeWithContent{
		Resume:         resume,
		ContactProfile: contact,
		Settings:       settings,
		Theme:          theme,
		Sections:       sectionsWithItems,
	}, nil
}

func (p *Postgres) sectionItemsForSectionWithVisibility(resumeID, sectionID string) ([]*model.SectionItem, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT si.id, si.workspace_id, si.type, si.headline, si.body, si.metadata,
		       si.created_by, si.created_at, si.updated_at, sil.sort_order,
		       COALESCE(riv.show_in_preview, false)
		FROM section_item_links sil
		JOIN section_items si ON si.id = sil.section_item_id
		LEFT JOIN resume_item_visibility riv
			ON riv.resume_id = $1 AND riv.section_id = $2 AND riv.section_item_id = si.id
		WHERE sil.section_id = $2
		ORDER BY sil.sort_order
	`, resumeID, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*model.SectionItem, 0)
	for rows.Next() {
		var item model.SectionItem
		var sectionType string
		var metadata []byte
		var createdAt, updatedAt time.Time
		var sortOrder int
		if err := rows.Scan(
			&item.ID, &item.WorkspaceID, &sectionType, &item.Headline, &item.Body, &metadata,
			&item.CreatedBy, &createdAt, &updatedAt, &sortOrder, &item.ShowInPreview,
		); err != nil {
			return nil, err
		}
		item.Type = model.SectionType(sectionType)
		item.Metadata = parseJSONMap(metadata)
		item.CreatedAt = formatTime(createdAt)
		item.UpdatedAt = formatTime(updatedAt)
		items = append(items, &item)
	}
	return items, nil
}

func (p *Postgres) SectionItemUsage(itemID string) (*model.SectionItemUsage, error) {
	item, err := p.GetSectionItem(itemID)
	if err != nil {
		return nil, err
	}

	rows, err := p.pool.Query(p.ctx(), `
		SELECT DISTINCT s.id, s.workspace_id, s.type, s.title, s.description, s.created_by, s.created_at, s.updated_at
		FROM section_item_links sil
		JOIN sections s ON s.id = sil.section_id
		WHERE sil.section_item_id = $1
	`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sections := scanSections(rows)

	resumeRows, err := p.pool.Query(p.ctx(), `
		SELECT DISTINCT r.id, r.workspace_id, r.title, r.contact_profile_id, r.created_by, r.created_at, r.updated_at
		FROM section_item_links sil
		JOIN resume_sections rs ON rs.section_id = sil.section_id
		JOIN resumes r ON r.id = rs.resume_id
		WHERE sil.section_item_id = $1
	`, itemID)
	if err != nil {
		return nil, err
	}
	defer resumeRows.Close()
	resumes := scanResumes(resumeRows)

	return &model.SectionItemUsage{
		SectionItem: item,
		Sections:    sections,
		Resumes:     resumes,
		Portfolios:  []*model.Portfolio{},
	}, nil
}

func (p *Postgres) WorkspaceStats() *model.WorkspaceStats {
	var stats model.WorkspaceStats
	_ = p.pool.QueryRow(p.ctx(), `SELECT COUNT(*) FROM resumes WHERE workspace_id = $1`, p.activeWorkspaceID()).Scan(&stats.ResumeCount)
	_ = p.pool.QueryRow(p.ctx(), `SELECT COUNT(*) FROM portfolios WHERE workspace_id = $1`, p.activeWorkspaceID()).Scan(&stats.PortfolioCount)
	_ = p.pool.QueryRow(p.ctx(), `SELECT COUNT(*) FROM sections WHERE workspace_id = $1`, p.activeWorkspaceID()).Scan(&stats.SectionCount)
	_ = p.pool.QueryRow(p.ctx(), `SELECT COUNT(*) FROM section_items WHERE workspace_id = $1`, p.activeWorkspaceID()).Scan(&stats.SectionItemCount)
	return &stats
}

func (p *Postgres) ResumesForSection(sectionID string) ([]*model.Resume, error) {
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT r.id, r.workspace_id, r.title, r.contact_profile_id, r.created_by, r.created_at, r.updated_at
		FROM resume_sections rs
		JOIN resumes r ON r.id = rs.resume_id
		WHERE rs.section_id = $1
	`, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanResumes(rows), nil
}

func (p *Postgres) SectionItemsForSection(sectionID string) ([]*model.SectionItem, error) {
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT si.id, si.workspace_id, si.type, si.headline, si.body, si.metadata, si.created_by, si.created_at, si.updated_at
		FROM section_item_links sil
		JOIN section_items si ON si.id = sil.section_item_id
		WHERE sil.section_id = $1
		ORDER BY sil.sort_order
	`, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := scanSectionItems(rows)
	for _, item := range items {
		withDefaultShowInPreview(item)
	}
	return items, nil
}

func (p *Postgres) ListAssistantMessages(threadID string, limit int) []*model.AssistantMessage {
	if !p.threadInWorkspace(threadID) {
		return nil
	}
	if limit <= 0 {
		limit = 50
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, thread_id, role, content, context, created_at
		FROM assistant_messages
		WHERE thread_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, threadID, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()

	messages := scanAssistantMessages(rows)
	sort.Slice(messages, func(i, j int) bool {
		return messages[i].CreatedAt < messages[j].CreatedAt
	})
	return messages
}

func (p *Postgres) AppendAssistantMessage(msg *model.AssistantMessage) {
	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO assistant_messages (id, thread_id, role, content, context, created_at)
		VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
	`, msg.ID, msg.ThreadID, string(msg.Role), msg.Content, jsonBytes(msg.Context), msg.CreatedAt)
	_, _ = p.pool.Exec(p.ctx(), `
		UPDATE assistant_threads SET updated_at = $2::timestamptz WHERE id = $1
	`, msg.ThreadID, msg.CreatedAt)
}

func (p *Postgres) AppendActionLog(log *model.AssistantActionLog) {
	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO assistant_action_logs (id, message_id, op, payload, success, error, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
	`, log.ID, log.MessageID, log.Op, jsonBytes(log.Payload), log.Success, log.Error, log.CreatedAt)
}

func (p *Postgres) DuplicateResume(sourceID string) (*model.Resume, error) {
	ctx := p.ctx()
	source, err := p.GetResume(sourceID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	newID := uuid.NewString()
	newResume := &model.Resume{
		ID:          newID,
		WorkspaceID: source.WorkspaceID,
		Title:       source.Title + " (copy)",
		CreatedBy:   source.CreatedBy,
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
	}
	if source.ContactProfileID != nil {
		contactID := *source.ContactProfileID
		newResume.ContactProfileID = &contactID
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO resumes (id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
	`, newResume.ID, newResume.WorkspaceID, newResume.Title, newResume.ContactProfileID,
		newResume.CreatedBy, now)
	if err != nil {
		return nil, err
	}

	settings := p.GetResumeSettings(sourceID)
	_, err = tx.Exec(ctx, `
		INSERT INTO resume_settings (
			resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
			contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
			page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, locale
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, newID, settings.ThemeID, string(settings.FontSize),
		string(settings.ContactNameFontSize), string(settings.ContactHeadlineFontSize),
		string(settings.ContactDetailsFontSize), string(settings.SectionTitleFontSize),
		string(settings.ItemTitleFontSize), string(settings.ItemMetaFontSize),
		string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, string(settings.ItemTitleLayout), settings.Locale)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO resume_sections (resume_id, section_id, sort_order)
		SELECT $1, section_id, sort_order FROM resume_sections WHERE resume_id = $2
	`, newID, sourceID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO resume_item_visibility (resume_id, section_id, section_item_id, show_in_preview)
		SELECT $1, section_id, section_item_id, show_in_preview
		FROM resume_item_visibility WHERE resume_id = $2
	`, newID, sourceID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return newResume, nil
}

func (p *Postgres) DeleteResume(id string) error {
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM resumes WHERE id = $1 AND workspace_id = $2`, id, p.activeWorkspaceID())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) CreateResume(title string) *model.Resume {
	now := time.Now().UTC()
	id := uuid.NewString()
	resume := &model.Resume{
		ID:          id,
		WorkspaceID: p.activeWorkspaceID(),
		Title:       title,
		CreatedBy:   p.activeUserID(),
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
	}
	settings := defaultResumeSettings(id)

	ctx := p.ctx()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return resume
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO resumes (id, workspace_id, title, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
	`, resume.ID, resume.WorkspaceID, resume.Title, resume.CreatedBy, now)
	if err != nil {
		return resume
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO resume_settings (
			resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
			contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
			page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, locale
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, settings.ResumeID, settings.ThemeID, string(settings.FontSize),
		string(settings.ContactNameFontSize), string(settings.ContactHeadlineFontSize),
		string(settings.ContactDetailsFontSize), string(settings.SectionTitleFontSize),
		string(settings.ItemTitleFontSize), string(settings.ItemMetaFontSize),
		string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, string(settings.ItemTitleLayout), settings.Locale)
	if err != nil {
		return resume
	}

	sections, err := p.ensureWorkspaceDefaultSectionsTx(ctx, tx)
	if err != nil {
		return resume
	}
	for i, section := range sections {
		_, err = tx.Exec(ctx, `
			INSERT INTO resume_sections (resume_id, section_id, sort_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (resume_id, section_id) DO NOTHING
		`, resume.ID, section.ID, i)
		if err != nil {
			return resume
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO resume_item_visibility (resume_id, section_id, section_item_id, show_in_preview)
		SELECT $1, sil.section_id, sil.section_item_id, false
		FROM resume_sections rs
		JOIN section_item_links sil ON sil.section_id = rs.section_id
		WHERE rs.resume_id = $1
		ON CONFLICT (resume_id, section_id, section_item_id) DO NOTHING
	`, resume.ID)
	if err != nil {
		return resume
	}

	_ = tx.Commit(ctx)
	return resume
}

func (p *Postgres) ensureWorkspaceDefaultSectionsTx(ctx context.Context, tx pgx.Tx) ([]*model.Section, error) {
	specs := resumeDefaultSectionSpecs()

	sections := make([]*model.Section, 0, len(specs))
	workspaceID := p.activeWorkspaceID()
	userID := p.activeUserID()
	now := time.Now().UTC()

	// Ensure every section type exists in the workspace (lazy for older workspaces).
	for _, spec := range allWorkspaceSectionSpecs() {
		if _, err := p.ensureWorkspaceSectionTx(ctx, tx, spec, workspaceID, userID, now); err != nil {
			return nil, err
		}
	}

	for _, spec := range specs {
		section, err := p.ensureWorkspaceSectionTx(ctx, tx, spec, workspaceID, userID, now)
		if err != nil {
			return nil, err
		}
		sections = append(sections, section)
	}

	return sections, nil
}

func (p *Postgres) ensureWorkspaceSectionTx(
	ctx context.Context,
	tx pgx.Tx,
	spec workspaceSectionSpec,
	workspaceID, userID string,
	now time.Time,
) (*model.Section, error) {
	row := tx.QueryRow(ctx, `
		SELECT id, workspace_id, type, title, description, created_by, created_at, updated_at
		FROM sections
		WHERE workspace_id = $1 AND type = $2
		ORDER BY created_at
		LIMIT 1
	`, workspaceID, string(spec.sectionType))
	section, err := scanSection(row)
	if err == nil {
		return section, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	sectionID := uuid.NewString()
	_, err = tx.Exec(ctx, `
		INSERT INTO sections (id, workspace_id, type, title, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
	`, sectionID, workspaceID, string(spec.sectionType), spec.title, userID, now)
	if err != nil {
		return nil, err
	}
	return &model.Section{
		ID:          sectionID,
		WorkspaceID: workspaceID,
		Type:        spec.sectionType,
		Title:       spec.title,
		CreatedBy:   userID,
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
	}, nil
}

func (p *Postgres) getSectionTx(ctx context.Context, tx pgx.Tx, id string) (*model.Section, error) {
	row := tx.QueryRow(ctx, `
		SELECT id, workspace_id, type, title, description, created_by, created_at, updated_at
		FROM sections WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	s, err := scanSection(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// scan helpers

type scannable interface {
	Scan(dest ...any) error
}

func scanUser(row scannable) (*model.User, error) {
	var u model.User
	var avatarURL *string
	var role string
	var createdAt, updatedAt time.Time
	if err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &avatarURL, &role, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	u.AvatarURL = avatarURL
	u.Role = normalizeUserRole(role)
	u.CreatedAt = formatTime(createdAt)
	u.UpdatedAt = formatTime(updatedAt)
	return cloneUser(&u), nil
}

func normalizeUserRole(role string) model.UserRole {
	if model.UserRole(strings.ToUpper(strings.TrimSpace(role))) == model.UserRoleAdmin {
		return model.UserRoleAdmin
	}
	return model.UserRoleUser
}

func scanWorkspace(row scannable) (*model.Workspace, error) {
	var w model.Workspace
	var createdAt, updatedAt time.Time
	if err := row.Scan(&w.ID, &w.Name, &w.Slug, &w.OwnerID, &w.Plan, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	w.CreatedAt = formatTime(createdAt)
	w.UpdatedAt = formatTime(updatedAt)
	return cloneWorkspace(&w), nil
}

func scanThread(row scannable) (*model.AssistantThread, error) {
	var t model.AssistantThread
	var createdAt, updatedAt time.Time
	if err := row.Scan(&t.ID, &t.WorkspaceID, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	t.CreatedAt = formatTime(createdAt)
	t.UpdatedAt = formatTime(updatedAt)
	return cloneThread(&t), nil
}

func scanThreadWithPreview(row scannable) (*model.AssistantThread, error) {
	var t model.AssistantThread
	var createdAt, updatedAt time.Time
	var preview string
	if err := row.Scan(&t.ID, &t.WorkspaceID, &createdAt, &updatedAt, &preview); err != nil {
		return nil, err
	}
	t.CreatedAt = formatTime(createdAt)
	t.UpdatedAt = formatTime(updatedAt)
	if preview != "" {
		t.Preview = &preview
	}
	return cloneThread(&t), nil
}

func scanThreadsWithPreview(rows pgx.Rows) []*model.AssistantThread {
	out := make([]*model.AssistantThread, 0)
	for rows.Next() {
		t, err := scanThreadWithPreview(rows)
		if err != nil {
			continue
		}
		out = append(out, t)
	}
	return out
}

func scanTheme(row scannable) (*model.CvTheme, error) {
	var t model.CvTheme
	var config []byte
	if err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.IsSystem, &config); err != nil {
		return nil, err
	}
	t.Config = parseJSONMap(config)
	return cloneTheme(&t), nil
}

func scanThemes(rows pgx.Rows) []*model.CvTheme {
	out := make([]*model.CvTheme, 0)
	for rows.Next() {
		var t model.CvTheme
		var config []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.IsSystem, &config); err != nil {
			continue
		}
		t.Config = parseJSONMap(config)
		out = append(out, cloneTheme(&t))
	}
	return out
}

func scanResume(row scannable) (*model.Resume, error) {
	var r model.Resume
	var createdAt, updatedAt time.Time
	if err := row.Scan(&r.ID, &r.WorkspaceID, &r.Title, &r.ContactProfileID, &r.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	r.CreatedAt = formatTime(createdAt)
	r.UpdatedAt = formatTime(updatedAt)
	return cloneResume(&r), nil
}

func scanResumes(rows pgx.Rows) []*model.Resume {
	out := make([]*model.Resume, 0)
	for rows.Next() {
		var r model.Resume
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&r.ID, &r.WorkspaceID, &r.Title, &r.ContactProfileID, &r.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		r.CreatedAt = formatTime(createdAt)
		r.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneResume(&r))
	}
	return out
}

func scanSection(row scannable) (*model.Section, error) {
	var s model.Section
	var sectionType string
	var createdAt, updatedAt time.Time
	if err := row.Scan(&s.ID, &s.WorkspaceID, &sectionType, &s.Title, &s.Description, &s.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	s.Type = model.SectionType(sectionType)
	s.CreatedAt = formatTime(createdAt)
	s.UpdatedAt = formatTime(updatedAt)
	return cloneSection(&s), nil
}

func scanSections(rows pgx.Rows) []*model.Section {
	out := make([]*model.Section, 0)
	for rows.Next() {
		var s model.Section
		var sectionType string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&s.ID, &s.WorkspaceID, &sectionType, &s.Title, &s.Description, &s.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		s.Type = model.SectionType(sectionType)
		s.CreatedAt = formatTime(createdAt)
		s.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneSection(&s))
	}
	return out
}

func scanSectionItem(row scannable) (*model.SectionItem, error) {
	var item model.SectionItem
	var sectionType string
	var metadata []byte
	var createdAt, updatedAt time.Time
	if err := row.Scan(&item.ID, &item.WorkspaceID, &sectionType, &item.Headline, &item.Body, &metadata, &item.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	item.Type = model.SectionType(sectionType)
	item.Metadata = parseJSONMap(metadata)
	item.CreatedAt = formatTime(createdAt)
	item.UpdatedAt = formatTime(updatedAt)
	return cloneSectionItem(&item), nil
}

func scanSectionItems(rows pgx.Rows) []*model.SectionItem {
	out := make([]*model.SectionItem, 0)
	for rows.Next() {
		var item model.SectionItem
		var sectionType string
		var metadata []byte
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&item.ID, &item.WorkspaceID, &sectionType, &item.Headline, &item.Body, &metadata, &item.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		item.Type = model.SectionType(sectionType)
		item.Metadata = parseJSONMap(metadata)
		item.CreatedAt = formatTime(createdAt)
		item.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneSectionItem(&item))
	}
	return out
}

func scanContactProfile(row scannable) (*model.ContactProfile, error) {
	var cp model.ContactProfile
	var createdAt, updatedAt time.Time
	if err := row.Scan(&cp.ID, &cp.WorkspaceID, &cp.FullName, &cp.Headline, &cp.Email, &cp.Phone, &cp.Location, &cp.Website, &cp.LinkedIn, &cp.Github, &cp.PhotoURL, &cp.LinkedinPhotoURL, &cp.GithubPhotoURL, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	cp.CreatedAt = formatTime(createdAt)
	cp.UpdatedAt = formatTime(updatedAt)
	return cloneContactProfile(&cp), nil
}

func scanContactProfiles(rows pgx.Rows) []*model.ContactProfile {
	out := make([]*model.ContactProfile, 0)
	for rows.Next() {
		var cp model.ContactProfile
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&cp.ID, &cp.WorkspaceID, &cp.FullName, &cp.Headline, &cp.Email, &cp.Phone, &cp.Location, &cp.Website, &cp.LinkedIn, &cp.Github, &cp.PhotoURL, &cp.LinkedinPhotoURL, &cp.GithubPhotoURL, &createdAt, &updatedAt); err != nil {
			continue
		}
		cp.CreatedAt = formatTime(createdAt)
		cp.UpdatedAt = formatTime(updatedAt)
		out = append(out, cloneContactProfile(&cp))
	}
	return out
}

func scanResumeSettings(row scannable) (*model.ResumeSettings, error) {
	var s model.ResumeSettings
	var fontSize, contactNameFontSize, contactHeadlineFontSize, contactDetailsFontSize string
	var sectionTitleFontSize, itemTitleFontSize, itemMetaFontSize, pageFormat, itemTitleLayout string
	if err := row.Scan(
		&s.ResumeID, &s.ThemeID, &fontSize, &contactNameFontSize, &contactHeadlineFontSize,
		&contactDetailsFontSize, &sectionTitleFontSize, &itemTitleFontSize, &itemMetaFontSize,
		&pageFormat, &s.MarginHorizontalMm, &s.MarginVerticalMm, &s.ShowPhoto, &itemTitleLayout, &s.Locale,
	); err != nil {
		return nil, err
	}
	s.FontSize = model.FontSize(fontSize)
	s.ContactNameFontSize = model.FontSize(contactNameFontSize)
	s.ContactHeadlineFontSize = model.FontSize(contactHeadlineFontSize)
	s.ContactDetailsFontSize = model.FontSize(contactDetailsFontSize)
	s.SectionTitleFontSize = model.FontSize(sectionTitleFontSize)
	s.ItemTitleFontSize = model.FontSize(itemTitleFontSize)
	s.ItemMetaFontSize = model.FontSize(itemMetaFontSize)
	s.PageFormat = model.PageFormat(pageFormat)
	s.ItemTitleLayout = model.ItemTitleLayout(itemTitleLayout)
	if !s.FontSize.IsValid() {
		s.FontSize = model.FontSizeM
	}
	if !s.ContactNameFontSize.IsValid() {
		s.ContactNameFontSize = model.FontSizeM
	}
	if !s.ContactHeadlineFontSize.IsValid() {
		s.ContactHeadlineFontSize = model.FontSizeM
	}
	if !s.ContactDetailsFontSize.IsValid() {
		s.ContactDetailsFontSize = model.FontSizeM
	}
	if !s.SectionTitleFontSize.IsValid() {
		s.SectionTitleFontSize = model.FontSizeM
	}
	if !s.ItemTitleFontSize.IsValid() {
		s.ItemTitleFontSize = model.FontSizeM
	}
	if !s.ItemMetaFontSize.IsValid() {
		s.ItemMetaFontSize = model.FontSizeM
	}
	if !s.ItemTitleLayout.IsValid() {
		s.ItemTitleLayout = model.ItemTitleLayoutStacked
	}
	return cloneResumeSettings(&s), nil
}

func scanAssistantMessages(rows pgx.Rows) []*model.AssistantMessage {
	out := make([]*model.AssistantMessage, 0)
	for rows.Next() {
		var msg model.AssistantMessage
		var role string
		var context []byte
		var createdAt time.Time
		if err := rows.Scan(&msg.ID, &msg.ThreadID, &role, &msg.Content, &context, &createdAt); err != nil {
			continue
		}
		msg.Role = model.AssistantMessageRole(role)
		msg.Context = parseJSONMap(context)
		msg.CreatedAt = formatTime(createdAt)
		out = append(out, cloneAssistantMessage(&msg))
	}
	return out
}
