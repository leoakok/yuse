package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/slug"
)

var ErrSlugTaken = errors.New("slug already taken")
var ErrUsernameTaken = errors.New("username already taken")

// SetUsername assigns a unique public username to the signed-in user.
func (p *Postgres) SetUsername(userID, raw string) (*model.User, error) {
	normalized, err := slug.Validate(raw)
	if err != nil {
		return nil, err
	}

	ctx := p.ctx()
	var existingID string
	err = p.pool.QueryRow(ctx, `
		SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2
	`, normalized, userID).Scan(&existingID)
	if err == nil {
		return nil, ErrUsernameTaken
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check username: %w", err)
	}

	now := time.Now().UTC()
	tag, err := p.pool.Exec(ctx, `
		UPDATE users SET username = $2, updated_at = $3 WHERE id = $1
	`, userID, normalized, now)
	if err != nil {
		return nil, fmt.Errorf("set username: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return UserByID(ctx, p.pool, userID)
}

// SetPortfolioSlug assigns a unique slug for a portfolio owned by the signed-in user.
func (p *Postgres) SetPortfolioSlug(userID, portfolioID, raw string) (*model.Portfolio, error) {
	normalized, err := slug.Validate(raw)
	if err != nil {
		return nil, err
	}

	portfolio, err := p.GetPortfolio(portfolioID)
	if err != nil {
		return nil, err
	}
	if portfolio.CreatedBy != userID {
		return nil, ErrNotFound
	}

	ctx := p.ctx()
	if err := p.ensureUserSlugAvailable(ctx, userID, normalized, "portfolio", portfolioID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	tag, err := p.pool.Exec(ctx, `
		UPDATE portfolios SET slug = $2, updated_at = $3
		WHERE id = $1 AND workspace_id = $4
	`, portfolioID, normalized, now, p.activeWorkspaceID())
	if err != nil {
		return nil, fmt.Errorf("set portfolio slug: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return p.GetPortfolio(portfolioID)
}

// SetResumeSlug assigns a unique public slug for a resume owned by the signed-in user.
func (p *Postgres) SetResumeSlug(userID, resumeID, raw string) (*model.Resume, error) {
	normalized, err := slug.Validate(raw)
	if err != nil {
		return nil, err
	}

	resume, err := p.GetResume(resumeID)
	if err != nil {
		return nil, err
	}
	if resume.CreatedBy != userID {
		return nil, ErrNotFound
	}

	ctx := p.ctx()
	if err := p.ensureUserSlugAvailable(ctx, userID, normalized, "resume", resumeID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	tag, err := p.pool.Exec(ctx, `
		UPDATE resumes SET slug = $2, updated_at = $3
		WHERE id = $1 AND workspace_id = $4
	`, resumeID, normalized, now, p.activeWorkspaceID())
	if err != nil {
		return nil, fmt.Errorf("set resume slug: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return p.GetResume(resumeID)
}

func (p *Postgres) ensureUserSlugAvailable(ctx context.Context, userID, normalizedSlug, excludeKind, excludeID string) error {
	var existingID string
	err := p.pool.QueryRow(ctx, `
		SELECT id FROM portfolios
		WHERE created_by = $1 AND LOWER(slug) = LOWER($2) AND NOT ($3 = 'portfolio' AND id = $4)
	`, userID, normalizedSlug, excludeKind, excludeID).Scan(&existingID)
	if err == nil {
		return ErrSlugTaken
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check portfolio slug: %w", err)
	}

	err = p.pool.QueryRow(ctx, `
		SELECT id FROM resumes
		WHERE created_by = $1 AND LOWER(slug) = LOWER($2) AND NOT ($3 = 'resume' AND id = $4)
	`, userID, normalizedSlug, excludeKind, excludeID).Scan(&existingID)
	if err == nil {
		return ErrSlugTaken
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check resume slug: %w", err)
	}
	return nil
}

// PublicPortfolioWithContent loads a portfolio by public username and optional slug.
func (p *Postgres) PublicPortfolioWithContent(username string, slugOpt *string) (*model.PortfolioWithContent, error) {
	normalizedUser, err := slug.Validate(username)
	if err != nil {
		return nil, ErrNotFound
	}

	ctx := p.ctx()
	var portfolioID string
	if slugOpt != nil && strings.TrimSpace(*slugOpt) != "" {
		normalizedSlug, err := slug.Validate(*slugOpt)
		if err != nil {
			return nil, ErrNotFound
		}
		err = p.pool.QueryRow(ctx, `
			SELECT p.id
			FROM portfolios p
			INNER JOIN users u ON u.id = p.created_by
			WHERE LOWER(u.username) = LOWER($1) AND LOWER(p.slug) = LOWER($2)
			LIMIT 1
		`, normalizedUser, normalizedSlug).Scan(&portfolioID)
	} else {
		err = p.pool.QueryRow(ctx, `
			SELECT p.id
			FROM portfolios p
			INNER JOIN users u ON u.id = p.created_by
			WHERE LOWER(u.username) = LOWER($1)
			ORDER BY p.created_at ASC
			LIMIT 1
		`, normalizedUser).Scan(&portfolioID)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("resolve public portfolio: %w", err)
	}
	return p.portfolioWithContentUnscoped(portfolioID)
}

// PublicResumeWithContent loads a resume by public username and optional slug.
func (p *Postgres) PublicResumeWithContent(username string, slugOpt *string) (*model.ResumeWithContent, error) {
	normalizedUser, err := slug.Validate(username)
	if err != nil {
		return nil, ErrNotFound
	}

	ctx := p.ctx()
	var resumeID string
	if slugOpt != nil && strings.TrimSpace(*slugOpt) != "" {
		normalizedSlug, err := slug.Validate(*slugOpt)
		if err != nil {
			return nil, ErrNotFound
		}
		err = p.pool.QueryRow(ctx, `
			SELECT r.id
			FROM resumes r
			INNER JOIN users u ON u.id = r.created_by
			WHERE LOWER(u.username) = LOWER($1) AND LOWER(r.slug) = LOWER($2)
			LIMIT 1
		`, normalizedUser, normalizedSlug).Scan(&resumeID)
	} else {
		err = p.pool.QueryRow(ctx, `
			SELECT r.id
			FROM resumes r
			INNER JOIN users u ON u.id = r.created_by
			WHERE LOWER(u.username) = LOWER($1)
			ORDER BY r.created_at ASC
			LIMIT 1
		`, normalizedUser).Scan(&resumeID)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("resolve public resume: %w", err)
	}
	return p.resumeWithContentUnscoped(resumeID)
}

func (p *Postgres) resumeWithContentUnscoped(resumeID string) (*model.ResumeWithContent, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, title, slug, contact_profile_id, created_by, created_at, updated_at
		FROM resumes WHERE id = $1
	`, resumeID)
	resume, err := scanResume(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	settings := p.getResumeSettingsUnscoped(resumeID)
	var contact *model.ContactProfile
	if resume.ContactProfileID != nil {
		contact, _ = p.getContactProfileUnscoped(*resume.ContactProfileID)
	}
	theme, err := p.GetTheme(settings.ThemeID)
	if err != nil {
		return nil, err
	}

	rows, err := p.pool.Query(p.ctx(), `
		SELECT rs.section_id, rs.sort_order, COALESCE(rs.show_in_preview, true), rs.display_title
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
		var showInPreview bool
		var displayTitle *string
		if err := rows.Scan(&sectionID, &sortOrder, &showInPreview, &displayTitle); err != nil {
			return nil, err
		}
		if !showInPreview {
			continue
		}
		section, err := p.getSectionUnscoped(sectionID)
		if err != nil {
			continue
		}
		items, err := p.publicSectionItemsForResume(resumeID, sectionID)
		if err != nil {
			return nil, err
		}
		if len(items) == 0 && section.Type != model.SectionTypeSummary {
			continue
		}
		sectionsWithItems = append(sectionsWithItems, &model.SectionWithItems{
			Section:       section,
			DisplayTitle:  displayTitle,
			Items:         items,
			ShowInPreview: true,
		})
	}

	return &model.ResumeWithContent{
		Resume:         resume,
		ContactProfile: sanitizePublicContact(contact),
		Settings:       settings,
		Theme:          theme,
		Sections:       sectionsWithItems,
	}, nil
}

func (p *Postgres) getResumeSettingsUnscoped(resumeID string) *model.ResumeSettings {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
			contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
			page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout,
			item_title_separator, item_title_order, font_family, accent_color, section_divider_style,
			date_format, date_position, skills_layout, ats_mode, column_layout, sidebar_position,
			sidebar_width, design_preset_id, photo_position, photo_size, contact_layout, contact_fields,
			section_spacing, item_spacing, description_style, bullet_char, item_title_emphasis,
			highlight_current_role, location_display, heading_font_family, body_font_family,
			name_font_weight, section_title_font_weight, line_height, heading_letter_spacing,
			section_title_case, text_primary_color, text_muted_color, page_background, link_color,
			skills_proficiency, languages_layout, certifications_layout, keep_sections_together,
			max_items_before_break, footer_style, export_filename_template
		FROM resume_settings WHERE resume_id = $1
	`, resumeID)
	settings, err := scanResumeSettings(row)
	if err != nil {
		return defaultResumeSettings(resumeID)
	}
	return settings
}

func (p *Postgres) getSectionUnscoped(id string) (*model.Section, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, type, title, description, created_by, created_at, updated_at
		FROM sections WHERE id = $1
	`, id)
	return scanSection(row)
}

func (p *Postgres) publicSectionItemsForResume(resumeID, sectionID string) ([]*model.SectionItem, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT si.id, si.workspace_id, si.type, si.headline, si.body, si.metadata,
		       si.created_by, si.created_at, si.updated_at, sil.sort_order,
		       COALESCE(riv.show_in_preview, false)
		FROM section_item_links sil
		JOIN section_items si ON si.id = sil.section_item_id
		LEFT JOIN resume_item_visibility riv
			ON riv.resume_id = $1 AND riv.section_id = $2 AND riv.section_item_id = si.id
		WHERE sil.section_id = $2
		  AND COALESCE(riv.show_in_preview, false) = true
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
		var showInPreview bool
		if err := rows.Scan(
			&item.ID, &item.WorkspaceID, &sectionType, &item.Headline, &item.Body, &metadata,
			&item.CreatedBy, &createdAt, &updatedAt, &sortOrder, &showInPreview,
		); err != nil {
			return nil, err
		}
		item.Type = model.SectionType(sectionType)
		item.Metadata = parseJSONMap(metadata)
		item.CreatedAt = formatTime(createdAt)
		item.UpdatedAt = formatTime(updatedAt)
		item.ShowInPreview = true
		items = append(items, &item)
	}
	return items, nil
}

func (p *Postgres) portfolioWithContentUnscoped(portfolioID string) (*model.PortfolioWithContent, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, title, slug, tagline, about, contact_profile_id, created_by, created_at, updated_at
		FROM portfolios WHERE id = $1
	`, portfolioID)
	portfolio, err := scanPortfolio(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	settings := p.GetPortfolioSettings(portfolioID)
	var contact *model.ContactProfile
	if portfolio.ContactProfileID != nil {
		contact, _ = p.getContactProfileUnscoped(*portfolio.ContactProfileID)
	}
	theme, err := p.GetTheme(settings.ThemeID)
	if err != nil {
		return nil, err
	}
	projects, err := p.listPortfolioProjects(portfolioID)
	if err != nil {
		return nil, err
	}
	skills, err := p.listPortfolioSkills(portfolioID)
	if err != nil {
		return nil, err
	}
	testimonials, err := p.listPortfolioTestimonials(portfolioID)
	if err != nil {
		return nil, err
	}

	return &model.PortfolioWithContent{
		Portfolio:      portfolio,
		ContactProfile: sanitizePublicContact(contact),
		Settings:       settings,
		Theme:          theme,
		Projects:       filterVisibleProjects(projects),
		Skills:         filterVisibleSkills(skills),
		Testimonials:   filterVisibleTestimonials(testimonials),
	}, nil
}

func filterVisibleProjects(projects []*model.PortfolioProject) []*model.PortfolioProject {
	out := make([]*model.PortfolioProject, 0, len(projects))
	for _, project := range projects {
		if project != nil && project.ShowInPreview {
			out = append(out, project)
		}
	}
	return out
}

func filterVisibleSkills(skills []*model.PortfolioSkill) []*model.PortfolioSkill {
	out := make([]*model.PortfolioSkill, 0, len(skills))
	for _, skill := range skills {
		if skill != nil && skill.ShowInPreview {
			out = append(out, skill)
		}
	}
	return out
}

func filterVisibleTestimonials(testimonials []*model.PortfolioTestimonial) []*model.PortfolioTestimonial {
	out := make([]*model.PortfolioTestimonial, 0, len(testimonials))
	for _, testimonial := range testimonials {
		if testimonial != nil && testimonial.ShowInPreview {
			out = append(out, testimonial)
		}
	}
	return out
}

func sanitizePublicContact(contact *model.ContactProfile) *model.ContactProfile {
	if contact == nil {
		return nil
	}
	sanitized := *contact
	sanitized.Email = nil
	sanitized.Phone = nil
	return &sanitized
}

func (p *Postgres) getContactProfileUnscoped(id string) (*model.ContactProfile, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github,
			photo_url, linkedin_photo_url, github_photo_url, og_image_url, favicon_url, created_at, updated_at
		FROM contact_profiles WHERE id = $1
	`, id)
	return scanContactProfile(row)
}

// UserByUsername loads a user row by public username.
func UserByUsername(ctx context.Context, pool interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, username string) (*model.User, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, email, display_name, username, avatar_url, role, created_at, updated_at,
			(email_verified_at IS NOT NULL)
		FROM users WHERE LOWER(username) = LOWER($1)
	`, username)
	return scanUser(row)
}
