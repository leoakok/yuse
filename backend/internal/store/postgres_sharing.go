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
	var existingID string
	err = p.pool.QueryRow(ctx, `
		SELECT id FROM portfolios
		WHERE created_by = $1 AND LOWER(slug) = LOWER($2) AND id <> $3
	`, userID, normalized, portfolioID).Scan(&existingID)
	if err == nil {
		return nil, ErrSlugTaken
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check portfolio slug: %w", err)
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
		ContactProfile: contact,
		Settings:       settings,
		Theme:          theme,
		Projects:       projects,
		Skills:         skills,
		Testimonials:   testimonials,
	}, nil
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
		SELECT id, email, display_name, username, avatar_url, role, created_at, updated_at
		FROM users WHERE LOWER(username) = LOWER($1)
	`, username)
	return scanUser(row)
}
