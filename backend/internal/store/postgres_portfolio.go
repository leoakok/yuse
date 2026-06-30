package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (p *Postgres) ListPortfolios() []*model.Portfolio {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, workspace_id, title, tagline, about, contact_profile_id, created_by, created_at, updated_at
		FROM portfolios WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, p.activeWorkspaceID())
	if err != nil {
		return nil
	}
	defer rows.Close()
	return scanPortfolios(rows)
}

func (p *Postgres) GetPortfolio(id string) (*model.Portfolio, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, workspace_id, title, tagline, about, contact_profile_id, created_by, created_at, updated_at
		FROM portfolios WHERE id = $1 AND workspace_id = $2
	`, id, p.activeWorkspaceID())
	pf, err := scanPortfolio(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return pf, err
}

func (p *Postgres) SavePortfolio(portfolio *model.Portfolio) {
	_, _ = p.pool.Exec(p.ctx(), `
		INSERT INTO portfolios (id, workspace_id, title, tagline, about, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			tagline = EXCLUDED.tagline,
			about = EXCLUDED.about,
			contact_profile_id = EXCLUDED.contact_profile_id,
			updated_at = EXCLUDED.updated_at
	`, portfolio.ID, portfolio.WorkspaceID, portfolio.Title, portfolio.Tagline, portfolio.About,
		portfolio.ContactProfileID, portfolio.CreatedBy, portfolio.CreatedAt, portfolio.UpdatedAt)
}

func (p *Postgres) GetPortfolioSettings(portfolioID string) *model.PortfolioSettings {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT portfolio_id, theme_id, layout, accent_color, show_photo, locale
		FROM portfolio_settings WHERE portfolio_id = $1
	`, portfolioID)
	s, err := scanPortfolioSettings(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultPortfolioSettings(portfolioID)
	}
	if err != nil {
		return defaultPortfolioSettings(portfolioID)
	}
	return s
}

func (p *Postgres) UpdatePortfolioSettings(portfolioID string, update func(*model.PortfolioSettings)) (*model.PortfolioSettings, error) {
	if _, err := p.GetPortfolio(portfolioID); err != nil {
		return nil, err
	}

	settings := p.GetPortfolioSettings(portfolioID)
	settings = clonePortfolioSettings(settings)
	update(settings)

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO portfolio_settings (portfolio_id, theme_id, layout, accent_color, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (portfolio_id) DO UPDATE SET
			theme_id = EXCLUDED.theme_id,
			layout = EXCLUDED.layout,
			accent_color = EXCLUDED.accent_color,
			show_photo = EXCLUDED.show_photo,
			locale = EXCLUDED.locale
	`, settings.PortfolioID, settings.ThemeID, string(settings.Layout), settings.AccentColor, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return nil, fmt.Errorf("update portfolio settings: %w", err)
	}
	return clonePortfolioSettings(settings), nil
}

func (p *Postgres) PortfolioWithContent(portfolioID string) (*model.PortfolioWithContent, error) {
	portfolio, err := p.GetPortfolio(portfolioID)
	if err != nil {
		return nil, err
	}

	settings := p.GetPortfolioSettings(portfolioID)
	theme, _ := p.GetTheme(settings.ThemeID)
	if theme == nil {
		themes := p.ListThemes()
		if len(themes) > 1 {
			theme = themes[1]
		}
	}

	var contact *model.ContactProfile
	if portfolio.ContactProfileID != nil {
		contact, _ = p.GetContactProfile(*portfolio.ContactProfileID)
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
		ContactProfile: contact,
		Settings:       settings,
		Theme:          theme,
		Projects:       projects,
		Skills:         skills,
		Testimonials:   testimonials,
	}, nil
}

func (p *Postgres) AddPortfolioProject(input model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error) {
	if _, err := p.GetPortfolio(input.PortfolioID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	id := uuid.NewString()
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Untitled project"
	}
	tagline := ""
	if input.Tagline != nil {
		tagline = strings.TrimSpace(*input.Tagline)
	}
	problem, approach, outcome := "", "", ""
	if input.Problem != nil {
		problem = strings.TrimSpace(*input.Problem)
	}
	if input.Approach != nil {
		approach = strings.TrimSpace(*input.Approach)
	}
	if input.Outcome != nil {
		outcome = strings.TrimSpace(*input.Outcome)
	}
	featured := false
	if input.Featured != nil {
		featured = *input.Featured
	}
	techStack := input.TechStack
	if techStack == nil {
		techStack = []string{}
	}

	var maxSort int
	_ = p.pool.QueryRow(p.ctx(), `
		SELECT COALESCE(MAX(sort_order), -1) FROM portfolio_projects WHERE portfolio_id = $1
	`, input.PortfolioID).Scan(&maxSort)

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO portfolio_projects (
			id, portfolio_id, title, tagline, problem, approach, outcome, tech_stack,
			live_url, repo_url, image_url, featured, show_in_preview, sort_order, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14, $14)
	`, id, input.PortfolioID, title, tagline, problem, approach, outcome, jsonStringSlice(techStack),
		optionalStringValue(input.LiveURL), optionalStringValue(input.RepoURL), optionalStringValue(input.ImageURL),
		featured, maxSort+1, now)
	if err != nil {
		return nil, fmt.Errorf("add portfolio project: %w", err)
	}
	p.touchPortfolio(input.PortfolioID, now)
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) UpdatePortfolioProject(input model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error) {
	project, err := p.getPortfolioProject(input.PortfolioID, input.ProjectID)
	if err != nil {
		return nil, err
	}
	if input.Title != nil {
		project.Title = strings.TrimSpace(*input.Title)
	}
	if input.Tagline != nil {
		project.Tagline = strings.TrimSpace(*input.Tagline)
	}
	if input.Problem != nil {
		project.Problem = strings.TrimSpace(*input.Problem)
	}
	if input.Approach != nil {
		project.Approach = strings.TrimSpace(*input.Approach)
	}
	if input.Outcome != nil {
		project.Outcome = strings.TrimSpace(*input.Outcome)
	}
	if input.TechStack != nil {
		project.TechStack = input.TechStack
	}
	if input.LiveURL != nil {
		project.LiveURL = trimmedStringPtr(*input.LiveURL)
	}
	if input.RepoURL != nil {
		project.RepoURL = trimmedStringPtr(*input.RepoURL)
	}
	if input.ImageURL != nil {
		project.ImageURL = trimmedStringPtr(*input.ImageURL)
	}
	if input.Featured != nil {
		project.Featured = *input.Featured
	}
	if input.ShowInPreview != nil {
		project.ShowInPreview = *input.ShowInPreview
	}
	now := time.Now().UTC()
	_, err = p.pool.Exec(p.ctx(), `
		UPDATE portfolio_projects SET
			title = $3, tagline = $4, problem = $5, approach = $6, outcome = $7, tech_stack = $8,
			live_url = $9, repo_url = $10, image_url = $11, featured = $12, show_in_preview = $13, updated_at = $14
		WHERE id = $1 AND portfolio_id = $2
	`, project.ID, input.PortfolioID, project.Title, project.Tagline, project.Problem, project.Approach,
		project.Outcome, jsonStringSlice(project.TechStack), project.LiveURL, project.RepoURL, project.ImageURL,
		project.Featured, project.ShowInPreview, now)
	if err != nil {
		return nil, err
	}
	p.touchPortfolio(input.PortfolioID, now)
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) DeletePortfolioProject(portfolioID, projectID string) (*model.PortfolioWithContent, error) {
	if _, err := p.getPortfolioProject(portfolioID, projectID); err != nil {
		return nil, err
	}
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM portfolio_projects WHERE id = $1 AND portfolio_id = $2`, projectID, portfolioID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	p.touchPortfolio(portfolioID, time.Now().UTC())
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) SetPortfolioProjectVisibility(portfolioID, projectID string, showInPreview bool) (*model.PortfolioWithContent, error) {
	if _, err := p.getPortfolioProject(portfolioID, projectID); err != nil {
		return nil, err
	}
	_, err := p.pool.Exec(p.ctx(), `
		UPDATE portfolio_projects SET show_in_preview = $3, updated_at = $4
		WHERE id = $1 AND portfolio_id = $2
	`, projectID, portfolioID, showInPreview, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) AddPortfolioSkill(input model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error) {
	if _, err := p.GetPortfolio(input.PortfolioID); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, fmt.Errorf("skill name is required")
	}
	id := uuid.NewString()
	var maxSort int
	_ = p.pool.QueryRow(p.ctx(), `
		SELECT COALESCE(MAX(sort_order), -1) FROM portfolio_skills WHERE portfolio_id = $1
	`, input.PortfolioID).Scan(&maxSort)
	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO portfolio_skills (id, portfolio_id, name, category, show_in_preview, sort_order)
		VALUES ($1, $2, $3, $4, true, $5)
	`, id, input.PortfolioID, name, optionalStringValue(input.Category), maxSort+1)
	if err != nil {
		return nil, err
	}
	p.touchPortfolio(input.PortfolioID, time.Now().UTC())
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) UpdatePortfolioSkill(input model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error) {
	skill, err := p.getPortfolioSkill(input.PortfolioID, input.SkillID)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		skill.Name = strings.TrimSpace(*input.Name)
	}
	if input.Category != nil {
		skill.Category = trimmedStringPtr(*input.Category)
	}
	if input.ShowInPreview != nil {
		skill.ShowInPreview = *input.ShowInPreview
	}
	_, err = p.pool.Exec(p.ctx(), `
		UPDATE portfolio_skills SET name = $3, category = $4, show_in_preview = $5
		WHERE id = $1 AND portfolio_id = $2
	`, skill.ID, input.PortfolioID, skill.Name, skill.Category, skill.ShowInPreview)
	if err != nil {
		return nil, err
	}
	p.touchPortfolio(input.PortfolioID, time.Now().UTC())
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) DeletePortfolioSkill(portfolioID, skillID string) (*model.PortfolioWithContent, error) {
	if _, err := p.getPortfolioSkill(portfolioID, skillID); err != nil {
		return nil, err
	}
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM portfolio_skills WHERE id = $1 AND portfolio_id = $2`, skillID, portfolioID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	p.touchPortfolio(portfolioID, time.Now().UTC())
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) AddPortfolioTestimonial(input model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	if _, err := p.GetPortfolio(input.PortfolioID); err != nil {
		return nil, err
	}
	quote := strings.TrimSpace(input.Quote)
	if quote == "" {
		return nil, fmt.Errorf("quote is required")
	}
	author, role := "", ""
	if input.Author != nil {
		author = strings.TrimSpace(*input.Author)
	}
	if input.Role != nil {
		role = strings.TrimSpace(*input.Role)
	}
	id := uuid.NewString()
	var maxSort int
	_ = p.pool.QueryRow(p.ctx(), `
		SELECT COALESCE(MAX(sort_order), -1) FROM portfolio_testimonials WHERE portfolio_id = $1
	`, input.PortfolioID).Scan(&maxSort)
	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO portfolio_testimonials (id, portfolio_id, quote, author, role, show_in_preview, sort_order)
		VALUES ($1, $2, $3, $4, $5, true, $6)
	`, id, input.PortfolioID, quote, author, role, maxSort+1)
	if err != nil {
		return nil, err
	}
	p.touchPortfolio(input.PortfolioID, time.Now().UTC())
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) UpdatePortfolioTestimonial(input model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	t, err := p.getPortfolioTestimonial(input.PortfolioID, input.TestimonialID)
	if err != nil {
		return nil, err
	}
	if input.Quote != nil {
		t.Quote = strings.TrimSpace(*input.Quote)
	}
	if input.Author != nil {
		t.Author = strings.TrimSpace(*input.Author)
	}
	if input.Role != nil {
		t.Role = strings.TrimSpace(*input.Role)
	}
	if input.ShowInPreview != nil {
		t.ShowInPreview = *input.ShowInPreview
	}
	_, err = p.pool.Exec(p.ctx(), `
		UPDATE portfolio_testimonials SET quote = $3, author = $4, role = $5, show_in_preview = $6
		WHERE id = $1 AND portfolio_id = $2
	`, t.ID, input.PortfolioID, t.Quote, t.Author, t.Role, t.ShowInPreview)
	if err != nil {
		return nil, err
	}
	p.touchPortfolio(input.PortfolioID, time.Now().UTC())
	return p.PortfolioWithContent(input.PortfolioID)
}

func (p *Postgres) DeletePortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioWithContent, error) {
	if _, err := p.getPortfolioTestimonial(portfolioID, testimonialID); err != nil {
		return nil, err
	}
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM portfolio_testimonials WHERE id = $1 AND portfolio_id = $2`, testimonialID, portfolioID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	p.touchPortfolio(portfolioID, time.Now().UTC())
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) UpdatePortfolioContactProfile(
	portfolioID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL, linkedinPhotoURL, githubPhotoURL *string,
) (*model.PortfolioWithContent, error) {
	ctx := p.ctx()
	portfolio, err := p.GetPortfolio(portfolioID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	var profile *model.ContactProfile

	if portfolio.ContactProfileID != nil {
		profile, _ = p.GetContactProfile(*portfolio.ContactProfileID)
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
			WorkspaceID: portfolio.WorkspaceID,
			FullName:    name,
			CreatedAt:   formatTime(now),
			UpdatedAt:   formatTime(now),
		}
		portfolio.ContactProfileID = &id
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
		profile.PhotoURL = trimmedStringPtr(*photoURL)
	}
	if linkedinPhotoURL != nil {
		profile.LinkedinPhotoURL = trimmedStringPtr(*linkedinPhotoURL)
	}
	if githubPhotoURL != nil {
		profile.GithubPhotoURL = trimmedStringPtr(*githubPhotoURL)
	}
	profile.UpdatedAt = formatTime(now)

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	createdAt := profile.CreatedAt
	_, err = tx.Exec(ctx, `
		INSERT INTO contact_profiles (id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github, photo_url, linkedin_photo_url, github_photo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::timestamptz, $15::timestamptz)
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

	portfolio.UpdatedAt = formatTime(now)
	_, err = tx.Exec(ctx, `
		UPDATE portfolios SET contact_profile_id = $1, updated_at = $2 WHERE id = $3 AND workspace_id = $4
	`, portfolio.ContactProfileID, now, portfolio.ID, portfolio.WorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("link contact profile: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) DuplicatePortfolio(sourceID string) (*model.Portfolio, error) {
	ctx := p.ctx()
	source, err := p.GetPortfolio(sourceID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	newID := uuid.NewString()
	newPortfolio := &model.Portfolio{
		ID:          newID,
		WorkspaceID: source.WorkspaceID,
		Title:       source.Title + " (copy)",
		Tagline:     source.Tagline,
		About:       source.About,
		CreatedBy:   source.CreatedBy,
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
	}
	if source.ContactProfileID != nil {
		contactID := *source.ContactProfileID
		newPortfolio.ContactProfileID = &contactID
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolios (id, workspace_id, title, tagline, about, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, newPortfolio.ID, newPortfolio.WorkspaceID, newPortfolio.Title, newPortfolio.Tagline, newPortfolio.About,
		newPortfolio.ContactProfileID, newPortfolio.CreatedBy, now)
	if err != nil {
		return nil, err
	}

	settings := p.GetPortfolioSettings(sourceID)
	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_settings (portfolio_id, theme_id, layout, accent_color, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, newID, settings.ThemeID, string(settings.Layout), settings.AccentColor, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return nil, err
	}

	projects, _ := p.listPortfolioProjects(sourceID)
	for _, proj := range projects {
		newProjID := uuid.NewString()
		_, err = tx.Exec(ctx, `
			INSERT INTO portfolio_projects (
				id, portfolio_id, title, tagline, problem, approach, outcome, tech_stack,
				live_url, repo_url, image_url, featured, show_in_preview, sort_order, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
		`, newProjID, newID, proj.Title, proj.Tagline, proj.Problem, proj.Approach, proj.Outcome,
			jsonStringSlice(proj.TechStack), proj.LiveURL, proj.RepoURL, proj.ImageURL,
			proj.Featured, proj.ShowInPreview, proj.SortOrder, now)
		if err != nil {
			return nil, err
		}
	}

	skills, _ := p.listPortfolioSkills(sourceID)
	for _, skill := range skills {
		_, err = tx.Exec(ctx, `
			INSERT INTO portfolio_skills (id, portfolio_id, name, category, show_in_preview, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.NewString(), newID, skill.Name, skill.Category, skill.ShowInPreview, skill.SortOrder)
		if err != nil {
			return nil, err
		}
	}

	testimonials, _ := p.listPortfolioTestimonials(sourceID)
	for _, t := range testimonials {
		_, err = tx.Exec(ctx, `
			INSERT INTO portfolio_testimonials (id, portfolio_id, quote, author, role, show_in_preview, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.NewString(), newID, t.Quote, t.Author, t.Role, t.ShowInPreview, t.SortOrder)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return newPortfolio, nil
}

func (p *Postgres) DeletePortfolio(id string) error {
	tag, err := p.pool.Exec(p.ctx(), `DELETE FROM portfolios WHERE id = $1 AND workspace_id = $2`, id, p.activeWorkspaceID())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *Postgres) CreatePortfolio(title string) *model.Portfolio {
	now := time.Now().UTC()
	id := uuid.NewString()
	portfolio := &model.Portfolio{
		ID:          id,
		WorkspaceID: p.activeWorkspaceID(),
		Title:       title,
		CreatedBy:   p.activeUserID(),
		CreatedAt:   formatTime(now),
		UpdatedAt:   formatTime(now),
	}
	settings := defaultPortfolioSettings(id)

	ctx := p.ctx()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return portfolio
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolios (id, workspace_id, title, tagline, about, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, '', '', $4, $5, $5)
	`, portfolio.ID, portfolio.WorkspaceID, portfolio.Title, portfolio.CreatedBy, now)
	if err != nil {
		return portfolio
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_settings (portfolio_id, theme_id, layout, accent_color, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, settings.PortfolioID, settings.ThemeID, string(settings.Layout), settings.AccentColor, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return portfolio
	}

	_ = tx.Commit(ctx)
	return portfolio
}

func (p *Postgres) touchPortfolio(portfolioID string, at time.Time) {
	_, _ = p.pool.Exec(p.ctx(), `UPDATE portfolios SET updated_at = $2 WHERE id = $1`, portfolioID, at)
}

func (p *Postgres) listPortfolioProjects(portfolioID string) ([]*model.PortfolioProject, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, portfolio_id, title, tagline, problem, approach, outcome, tech_stack,
			live_url, repo_url, image_url, featured, show_in_preview, sort_order, created_at, updated_at
		FROM portfolio_projects WHERE portfolio_id = $1 ORDER BY sort_order
	`, portfolioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPortfolioProjects(rows)
}

func (p *Postgres) getPortfolioProject(portfolioID, projectID string) (*model.PortfolioProject, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, portfolio_id, title, tagline, problem, approach, outcome, tech_stack,
			live_url, repo_url, image_url, featured, show_in_preview, sort_order, created_at, updated_at
		FROM portfolio_projects WHERE id = $1 AND portfolio_id = $2
	`, projectID, portfolioID)
	proj, err := scanPortfolioProject(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return proj, err
}

func (p *Postgres) listPortfolioSkills(portfolioID string) ([]*model.PortfolioSkill, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, portfolio_id, name, category, show_in_preview, sort_order
		FROM portfolio_skills WHERE portfolio_id = $1 ORDER BY sort_order
	`, portfolioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPortfolioSkills(rows)
}

func (p *Postgres) getPortfolioSkill(portfolioID, skillID string) (*model.PortfolioSkill, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, portfolio_id, name, category, show_in_preview, sort_order
		FROM portfolio_skills WHERE id = $1 AND portfolio_id = $2
	`, skillID, portfolioID)
	skill, err := scanPortfolioSkill(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return skill, err
}

func (p *Postgres) listPortfolioTestimonials(portfolioID string) ([]*model.PortfolioTestimonial, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT id, portfolio_id, quote, author, role, show_in_preview, sort_order
		FROM portfolio_testimonials WHERE portfolio_id = $1 ORDER BY sort_order
	`, portfolioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPortfolioTestimonials(rows)
}

func (p *Postgres) getPortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioTestimonial, error) {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT id, portfolio_id, quote, author, role, show_in_preview, sort_order
		FROM portfolio_testimonials WHERE id = $1 AND portfolio_id = $2
	`, testimonialID, portfolioID)
	t, err := scanPortfolioTestimonial(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func optionalStringValue(s *string) any {
	if s == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*s)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func scanPortfolio(row scannable) (*model.Portfolio, error) {
	var pf model.Portfolio
	var createdAt, updatedAt time.Time
	if err := row.Scan(&pf.ID, &pf.WorkspaceID, &pf.Title, &pf.Tagline, &pf.About, &pf.ContactProfileID, &pf.CreatedBy, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	pf.CreatedAt = formatTime(createdAt)
	pf.UpdatedAt = formatTime(updatedAt)
	return clonePortfolio(&pf), nil
}

func scanPortfolios(rows pgx.Rows) []*model.Portfolio {
	out := make([]*model.Portfolio, 0)
	for rows.Next() {
		var pf model.Portfolio
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&pf.ID, &pf.WorkspaceID, &pf.Title, &pf.Tagline, &pf.About, &pf.ContactProfileID, &pf.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		pf.CreatedAt = formatTime(createdAt)
		pf.UpdatedAt = formatTime(updatedAt)
		out = append(out, clonePortfolio(&pf))
	}
	return out
}

func scanPortfolioSettings(row scannable) (*model.PortfolioSettings, error) {
	var s model.PortfolioSettings
	var layout string
	if err := row.Scan(&s.PortfolioID, &s.ThemeID, &layout, &s.AccentColor, &s.ShowPhoto, &s.Locale); err != nil {
		return nil, err
	}
	s.Layout = model.PortfolioLayout(layout)
	return clonePortfolioSettings(&s), nil
}

func scanPortfolioProject(row scannable) (*model.PortfolioProject, error) {
	var proj model.PortfolioProject
	var techStack []byte
	var createdAt, updatedAt time.Time
	if err := row.Scan(
		&proj.ID, &proj.PortfolioID, &proj.Title, &proj.Tagline, &proj.Problem, &proj.Approach, &proj.Outcome,
		&techStack, &proj.LiveURL, &proj.RepoURL, &proj.ImageURL, &proj.Featured, &proj.ShowInPreview,
		&proj.SortOrder, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	proj.TechStack = parseStringSliceJSON(techStack)
	proj.CreatedAt = formatTime(createdAt)
	proj.UpdatedAt = formatTime(updatedAt)
	return clonePortfolioProject(&proj), nil
}

func scanPortfolioProjects(rows pgx.Rows) ([]*model.PortfolioProject, error) {
	out := make([]*model.PortfolioProject, 0)
	for rows.Next() {
		proj, err := scanPortfolioProject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, proj)
	}
	return out, nil
}

func scanPortfolioSkill(row scannable) (*model.PortfolioSkill, error) {
	var skill model.PortfolioSkill
	if err := row.Scan(&skill.ID, &skill.PortfolioID, &skill.Name, &skill.Category, &skill.ShowInPreview, &skill.SortOrder); err != nil {
		return nil, err
	}
	return clonePortfolioSkill(&skill), nil
}

func scanPortfolioSkills(rows pgx.Rows) ([]*model.PortfolioSkill, error) {
	out := make([]*model.PortfolioSkill, 0)
	for rows.Next() {
		skill, err := scanPortfolioSkill(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, skill)
	}
	return out, nil
}

func scanPortfolioTestimonial(row scannable) (*model.PortfolioTestimonial, error) {
	var t model.PortfolioTestimonial
	if err := row.Scan(&t.ID, &t.PortfolioID, &t.Quote, &t.Author, &t.Role, &t.ShowInPreview, &t.SortOrder); err != nil {
		return nil, err
	}
	return clonePortfolioTestimonial(&t), nil
}

func scanPortfolioTestimonials(rows pgx.Rows) ([]*model.PortfolioTestimonial, error) {
	out := make([]*model.PortfolioTestimonial, 0)
	for rows.Next() {
		t, err := scanPortfolioTestimonial(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, nil
}

func parseStringSliceJSON(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(data, &out); err != nil || out == nil {
		return []string{}
	}
	return out
}

func jsonStringSlice(items []string) []byte {
	if items == nil {
		items = []string{}
	}
	raw, _ := json.Marshal(items)
	return raw
}
