package store

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
)

const designShareAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
const designShareIDLength = 10

var (
	ErrDesignShareNotFound = errors.New("design share not found")
	ErrInvalidDesignURL    = errors.New("paste a design link (/d/...), not a full resume link")
)

var designURLPattern = regexp.MustCompile(`(?i)/d/([a-z0-9]{6,20})`)

type DesignShareRecord struct {
	ID               string
	ResumeID         string
	CreatedBy        string
	ContentMode      model.DesignShareContentMode
	SettingsSnapshot *model.ResumeSettings
	ThemeSnapshot    *model.CvTheme
	Title            *string
	IsActive         bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CuratedThemeRecord struct {
	ID                string
	Title             string
	DesignShareID     string
	Tags              []string
	FeaturedOnLanding bool
	IsPublic          bool
	SortOrder         int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

func designShareURLPath(id string) string {
	return "/d/" + strings.TrimSpace(id)
}

func generateDesignShareID() (string, error) {
	b := make([]byte, designShareIDLength)
	max := big.NewInt(int64(len(designShareAlphabet)))
	for i := range b {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b[i] = designShareAlphabet[n.Int64()]
	}
	return string(b), nil
}

func ParseDesignShareURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", ErrInvalidDesignURL
	}
	if strings.Contains(trimmed, "://") {
		parsed, err := url.Parse(trimmed)
		if err != nil {
			return "", ErrInvalidDesignURL
		}
		trimmed = parsed.Path
	}
	matches := designURLPattern.FindStringSubmatch(trimmed)
	if len(matches) < 2 {
		return "", ErrInvalidDesignURL
	}
	return matches[1], nil
}

func encodeSettingsSnapshot(settings *model.ResumeSettings) ([]byte, error) {
	if settings == nil {
		return nil, fmt.Errorf("settings snapshot required")
	}
	return json.Marshal(settings)
}

func decodeSettingsSnapshot(data []byte, resumeID string) (*model.ResumeSettings, error) {
	var settings model.ResumeSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return nil, err
	}
	settings.ResumeID = resumeID
	return &settings, nil
}

func encodeThemeSnapshot(theme *model.CvTheme) ([]byte, error) {
	if theme == nil {
		return nil, fmt.Errorf("theme snapshot required")
	}
	return json.Marshal(theme)
}

func decodeThemeSnapshot(data []byte) (*model.CvTheme, error) {
	var theme model.CvTheme
	if err := json.Unmarshal(data, &theme); err != nil {
		return nil, err
	}
	return &theme, nil
}

func scanDesignShare(row scannable) (*DesignShareRecord, error) {
	var rec DesignShareRecord
	var contentMode string
	var settingsJSON, themeJSON []byte
	var title *string
	if err := row.Scan(
		&rec.ID, &rec.ResumeID, &rec.CreatedBy, &contentMode,
		&settingsJSON, &themeJSON, &title, &rec.IsActive, &rec.CreatedAt, &rec.UpdatedAt,
	); err != nil {
		return nil, err
	}
	rec.ContentMode = model.DesignShareContentMode(contentMode)
	settings, err := decodeSettingsSnapshot(settingsJSON, rec.ResumeID)
	if err != nil {
		return nil, err
	}
	rec.SettingsSnapshot = settings
	theme, err := decodeThemeSnapshot(themeJSON)
	if err != nil {
		return nil, err
	}
	rec.ThemeSnapshot = theme
	rec.Title = title
	return &rec, nil
}

func (p *Postgres) getDesignShareRecord(id string) (*DesignShareRecord, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, resume_id, created_by, content_mode, settings_snapshot, theme_snapshot,
			title, is_active, created_at, updated_at
		FROM design_shares WHERE id = $1
	`, id)
	rec, err := scanDesignShare(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrDesignShareNotFound
	}
	return rec, err
}

func (p *Postgres) GetDesignShare(id string) (*model.DesignShare, error) {
	rec, err := p.getDesignShareRecord(id)
	if err != nil {
		return nil, err
	}
	return designShareModel(rec), nil
}

func (p *Postgres) DeactivateDesignShare(userID, shareID string) (*model.DesignShare, error) {
	rec, err := p.getDesignShareRecord(shareID)
	if err != nil {
		return nil, err
	}
	resume, err := p.GetResume(rec.ResumeID)
	if err != nil {
		return nil, err
	}
	if resume.CreatedBy != userID {
		return nil, ErrNotFound
	}
	now := time.Now().UTC()
	tag, err := p.pool.Exec(p.ctx(), `
		UPDATE design_shares SET is_active = FALSE, updated_at = $2 WHERE id = $1
	`, shareID, now)
	if err != nil {
		return nil, fmt.Errorf("deactivate design share: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrDesignShareNotFound
	}
	return p.GetDesignShare(shareID)
}

func (p *Postgres) GetDesignShareForResume(resumeID string) (*model.DesignShare, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, resume_id, created_by, content_mode, settings_snapshot, theme_snapshot,
			title, is_active, created_at, updated_at
		FROM design_shares WHERE resume_id = $1
	`, resumeID)
	rec, err := scanDesignShare(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return designShareModel(rec), nil
}

func (p *Postgres) UpsertDesignShare(userID, resumeID string, contentMode model.DesignShareContentMode, title *string, settings *model.ResumeSettings, theme *model.CvTheme) (*model.DesignShare, error) {
	resume, err := p.GetResume(resumeID)
	if err != nil {
		return nil, err
	}
	if resume.CreatedBy != userID {
		return nil, ErrNotFound
	}

	settingsJSON, err := encodeSettingsSnapshot(settings)
	if err != nil {
		return nil, err
	}
	themeJSON, err := encodeThemeSnapshot(theme)
	if err != nil {
		return nil, err
	}

	ctx := p.ctx()
	now := time.Now().UTC()

	existing, err := p.GetDesignShareForResume(resumeID)
	if err != nil {
		return nil, err
	}

	id := ""
	if existing != nil {
		id = existing.ID
	} else {
		for attempt := 0; attempt < 5; attempt++ {
			candidate, genErr := generateDesignShareID()
			if genErr != nil {
				return nil, genErr
			}
			var taken string
			qErr := p.pool.QueryRow(ctx, `SELECT id FROM design_shares WHERE id = $1`, candidate).Scan(&taken)
			if errors.Is(qErr, pgx.ErrNoRows) {
				id = candidate
				break
			}
			if qErr != nil {
				return nil, qErr
			}
		}
		if id == "" {
			return nil, fmt.Errorf("could not allocate design share id")
		}
	}

	if title == nil || strings.TrimSpace(*title) == "" {
		resumeTitle := resume.Title
		title = &resumeTitle
	}

	_, err = p.pool.Exec(ctx, `
		INSERT INTO design_shares (
			id, resume_id, created_by, content_mode, settings_snapshot, theme_snapshot, title, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8)
		ON CONFLICT (resume_id) DO UPDATE SET
			content_mode = EXCLUDED.content_mode,
			settings_snapshot = EXCLUDED.settings_snapshot,
			theme_snapshot = EXCLUDED.theme_snapshot,
			title = EXCLUDED.title,
			is_active = TRUE,
			updated_at = EXCLUDED.updated_at
	`, id, resumeID, userID, string(contentMode), settingsJSON, themeJSON, title, now)
	if err != nil {
		return nil, fmt.Errorf("upsert design share: %w", err)
	}
	return p.GetDesignShare(id)
}

func (p *Postgres) PublicDesignPreview(shareID string) (*model.DesignShare, *model.ResumeWithContent, error) {
	rec, err := p.getDesignShareRecord(shareID)
	if err != nil {
		return nil, nil, err
	}
	if !rec.IsActive {
		return nil, nil, ErrDesignShareNotFound
	}

	preview, err := p.buildDesignSharePreview(rec)
	if err != nil {
		return nil, nil, err
	}
	return designShareModel(rec), preview, nil
}

func (p *Postgres) buildDesignSharePreview(rec *DesignShareRecord) (*model.ResumeWithContent, error) {
	if rec.ContentMode == model.DesignShareContentModeDummy {
		return buildDummyPreviewFromStore(rec.SettingsSnapshot, rec.ThemeSnapshot), nil
	}
	content, err := p.resumeWithContentUnscoped(rec.ResumeID)
	if err != nil {
		return nil, err
	}
	return mergeDesignSnapshots(content, rec.SettingsSnapshot, rec.ThemeSnapshot), nil
}

func buildDummyPreviewFromStore(settings *model.ResumeSettings, theme *model.CvTheme) *model.ResumeWithContent {
	previewAt := "2026-01-01T00:00:00.000Z"
	ws := "design-preview"
	str := func(s string) *string { return &s }
	settingsCopy := *settings
	settingsCopy.ResumeID = "design-preview-resume"
	themeCopy := *theme

	contact := &model.ContactProfile{
		ID: ws + "-john", WorkspaceID: ws, FullName: "John Doe", Headline: str("Marketing Director"),
		Email: str("john.doe@email.com"), Location: str("New York, NY"), Website: str("johndoe.com"),
		CreatedAt: previewAt, UpdatedAt: previewAt,
	}

	return &model.ResumeWithContent{
		Resume: &model.Resume{
			ID: "design-preview-resume", WorkspaceID: ws, Title: "Design preview",
			ContactProfileID: str(contact.ID), CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
		},
		ContactProfile: contact,
		Settings:       &settingsCopy,
		Theme:          &themeCopy,
		Sections: []*model.SectionWithItems{
			{
				Section: &model.Section{ID: "s1", WorkspaceID: ws, Type: model.SectionTypeSummary, Title: "Summary", CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt},
				Items: []*model.SectionItem{{
					ID: "i1", WorkspaceID: ws, Type: model.SectionTypeSummary,
					Body: "Strategic marketing leader with 10 years driving brand growth, demand generation, and cross-functional launches.",
					ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
				}},
				ShowInPreview: true,
			},
			{
				Section: &model.Section{ID: "s2", WorkspaceID: ws, Type: model.SectionTypeExperience, Title: "Experience", CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt},
				Items: []*model.SectionItem{{
					ID: "i2", WorkspaceID: ws, Type: model.SectionTypeExperience, Headline: "Marketing Director",
					Body: "Led integrated campaigns across brand, product marketing, and lifecycle.",
					Metadata: map[string]any{"company": "Harbor & Co.", "startDate": "2020-01", "location": "New York, NY"},
					ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
				}},
				ShowInPreview: true,
			},
		},
	}
}

func mergeDesignSnapshots(content *model.ResumeWithContent, settings *model.ResumeSettings, theme *model.CvTheme) *model.ResumeWithContent {
	out := *content
	if settings != nil {
		s := *settings
		s.ResumeID = content.Resume.ID
		out.Settings = &s
	}
	if theme != nil {
		t := *theme
		out.Theme = &t
	}
	if out.ContactProfile != nil {
		out.ContactProfile = sanitizePublicContact(out.ContactProfile)
	}
	return &out
}

func (p *Postgres) ApplyDesignShareSettings(targetResumeID, userID string, snapshot *model.ResumeSettings) (*model.ResumeSettings, error) {
	resume, err := p.GetResume(targetResumeID)
	if err != nil {
		return nil, err
	}
	if resume.CreatedBy != userID {
		return nil, ErrNotFound
	}
	return p.UpdateResumeSettings(targetResumeID, func(current *model.ResumeSettings) {
		applySettingsSnapshot(current, snapshot)
	})
}

func applySettingsSnapshot(current, snapshot *model.ResumeSettings) {
	if current == nil || snapshot == nil {
		return
	}
	targetID := current.ResumeID
	*current = *snapshot
	current.ResumeID = targetID
}

func (p *Postgres) listCuratedThemeRecords(featuredOnLanding, isPublic *bool) ([]*CuratedThemeRecord, error) {
	query := `
		SELECT id, title, design_share_id, tags, featured_on_landing, is_public, sort_order, created_at, updated_at
		FROM curated_themes WHERE 1=1`
	args := []any{}
	argN := 1
	if featuredOnLanding != nil {
		query += fmt.Sprintf(" AND featured_on_landing = $%d", argN)
		args = append(args, *featuredOnLanding)
		argN++
	}
	if isPublic != nil {
		query += fmt.Sprintf(" AND is_public = $%d", argN)
		args = append(args, *isPublic)
	}
	query += " ORDER BY sort_order ASC, created_at ASC"

	rows, err := p.pool.Query(p.ctx(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*CuratedThemeRecord, 0)
	for rows.Next() {
		var rec CuratedThemeRecord
		if err := rows.Scan(
			&rec.ID, &rec.Title, &rec.DesignShareID, &rec.Tags,
			&rec.FeaturedOnLanding, &rec.IsPublic, &rec.SortOrder, &rec.CreatedAt, &rec.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, &rec)
	}
	return out, nil
}

func (p *Postgres) ListCuratedThemes(featuredOnLanding, isPublic *bool) ([]*model.CuratedTheme, error) {
	rows, err := p.listCuratedThemeRecords(featuredOnLanding, isPublic)
	if err != nil {
		return nil, err
	}
	return p.curatedThemesWithPreview(rows)
}

func (p *Postgres) curatedThemesWithPreview(rows []*CuratedThemeRecord) ([]*model.CuratedTheme, error) {
	out := make([]*model.CuratedTheme, 0, len(rows))
	for _, row := range rows {
		item, err := p.curatedThemeWithPreview(row)
		if err != nil {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func (p *Postgres) CreateCuratedTheme(actorID string, input model.CreateCuratedThemeInput) (*model.CuratedTheme, error) {
	shareID, err := ParseDesignShareURL(input.DesignURL)
	if err != nil {
		return nil, err
	}
	shareRec, err := p.getDesignShareRecord(shareID)
	if err != nil {
		return nil, err
	}
	if !shareRec.IsActive {
		return nil, ErrDesignShareNotFound
	}

	featured := false
	if input.FeaturedOnLanding != nil {
		featured = *input.FeaturedOnLanding
	}
	isPublic := false
	if input.IsPublic != nil {
		isPublic = *input.IsPublic
	}
	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}
	tags := input.Tags
	if tags == nil {
		tags = []string{}
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	_, err = p.pool.Exec(p.ctx(), `
		INSERT INTO curated_themes (id, title, design_share_id, tags, featured_on_landing, is_public, sort_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, id, strings.TrimSpace(input.Title), shareRec.ID, tags, featured, isPublic, sortOrder, now)
	if err != nil {
		return nil, fmt.Errorf("create curated theme: %w", err)
	}
	rec, err := p.getCuratedTheme(id)
	if err != nil {
		return nil, err
	}
	_ = RecordAdminAudit(context.Background(), p.pool, actorID, "create_curated_theme", "curated_theme", rec.ID, map[string]any{
		"title": rec.Title, "designShareId": rec.DesignShareID,
	})
	return p.curatedThemeWithPreview(rec)
}

func (p *Postgres) getCuratedTheme(id string) (*CuratedThemeRecord, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, title, design_share_id, tags, featured_on_landing, is_public, sort_order, created_at, updated_at
		FROM curated_themes WHERE id = $1
	`, id)
	var rec CuratedThemeRecord
	if err := row.Scan(
		&rec.ID, &rec.Title, &rec.DesignShareID, &rec.Tags,
		&rec.FeaturedOnLanding, &rec.IsPublic, &rec.SortOrder, &rec.CreatedAt, &rec.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &rec, nil
}

func (p *Postgres) UpdateCuratedTheme(actorID string, input model.UpdateCuratedThemeInput) (*model.CuratedTheme, error) {
	existing, err := p.getCuratedTheme(input.ID)
	if err != nil {
		return nil, err
	}
	title := existing.Title
	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		title = strings.TrimSpace(*input.Title)
	}
	tags := existing.Tags
	if input.Tags != nil {
		tags = input.Tags
	}
	featured := existing.FeaturedOnLanding
	if input.FeaturedOnLanding != nil {
		featured = *input.FeaturedOnLanding
	}
	isPublic := existing.IsPublic
	if input.IsPublic != nil {
		isPublic = *input.IsPublic
	}
	sortOrder := existing.SortOrder
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}
	now := time.Now().UTC()
	tag, err := p.pool.Exec(p.ctx(), `
		UPDATE curated_themes SET title = $2, tags = $3, featured_on_landing = $4, is_public = $5, sort_order = $6, updated_at = $7
		WHERE id = $1
	`, input.ID, title, tags, featured, isPublic, sortOrder, now)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	rec, err := p.getCuratedTheme(input.ID)
	if err != nil {
		return nil, err
	}
	_ = RecordAdminAudit(context.Background(), p.pool, actorID, "update_curated_theme", "curated_theme", rec.ID, nil)
	return p.curatedThemeWithPreview(rec)
}

func (p *Postgres) DeleteCuratedTheme(actorID, id string) (bool, error) {
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM curated_themes WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	ok := tag.RowsAffected() > 0
	if ok {
		_ = RecordAdminAudit(context.Background(), p.pool, actorID, "delete_curated_theme", "curated_theme", id, nil)
	}
	return ok, nil
}

func (p *Postgres) curatedThemeWithPreview(rec *CuratedThemeRecord) (*model.CuratedTheme, error) {
	shareRec, err := p.getDesignShareRecord(rec.DesignShareID)
	if err != nil {
		return nil, err
	}
	preview, err := p.buildDesignSharePreview(shareRec)
	if err != nil {
		return nil, err
	}
	return curatedThemeModel(rec, shareRec, preview), nil
}

func curatedThemeModel(rec *CuratedThemeRecord, share *DesignShareRecord, preview *model.ResumeWithContent) *model.CuratedTheme {
	tags := rec.Tags
	if tags == nil {
		tags = []string{}
	}
	return &model.CuratedTheme{
		ID:                rec.ID,
		Title:             rec.Title,
		DesignShareID:     rec.DesignShareID,
		Tags:              tags,
		FeaturedOnLanding: rec.FeaturedOnLanding,
		IsPublic:          rec.IsPublic,
		SortOrder:         rec.SortOrder,
		CreatedAt:         formatTime(rec.CreatedAt),
		UpdatedAt:         formatTime(rec.UpdatedAt),
		URLPath:           designShareURLPath(share.ID),
		Preview:           preview,
	}
}

func designShareModel(rec *DesignShareRecord) *model.DesignShare {
	return &model.DesignShare{
		ID:          rec.ID,
		ResumeID:    rec.ResumeID,
		ContentMode: rec.ContentMode,
		Title:       rec.Title,
		IsActive:    rec.IsActive,
		CreatedAt:   formatTime(rec.CreatedAt),
		UpdatedAt:   formatTime(rec.UpdatedAt),
		URLPath:     designShareURLPath(rec.ID),
	}
}