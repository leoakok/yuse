package store

import (
	"context"
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
		SELECT id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at
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
		SELECT id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at
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
		INSERT INTO portfolios (id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			contact_profile_id = EXCLUDED.contact_profile_id,
			updated_at = EXCLUDED.updated_at
	`, portfolio.ID, portfolio.WorkspaceID, portfolio.Title, portfolio.ContactProfileID,
		portfolio.CreatedBy, portfolio.CreatedAt, portfolio.UpdatedAt)
}

func (p *Postgres) GetPortfolioSettings(portfolioID string) *model.PortfolioSettings {
	row := p.pool.QueryRow(p.ctx(), `
		SELECT portfolio_id, theme_id, font_size, page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, locale
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
		INSERT INTO portfolio_settings (portfolio_id, theme_id, font_size, page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (portfolio_id) DO UPDATE SET
			theme_id = EXCLUDED.theme_id,
			font_size = EXCLUDED.font_size,
			page_format = EXCLUDED.page_format,
			margin_horizontal_mm = EXCLUDED.margin_horizontal_mm,
			margin_vertical_mm = EXCLUDED.margin_vertical_mm,
			show_photo = EXCLUDED.show_photo,
			locale = EXCLUDED.locale
	`, settings.PortfolioID, settings.ThemeID, string(settings.FontSize), string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return nil, fmt.Errorf("update portfolio settings: %w", err)
	}
	return clonePortfolioSettings(settings), nil
}

func (p *Postgres) UpdatePortfolioSectionItemVisibility(
	portfolioID, sectionID, sectionItemID string,
	showInPreview bool,
) (*model.PortfolioWithContent, error) {
	if _, err := p.GetPortfolio(portfolioID); err != nil {
		return nil, err
	}
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}
	if _, err := p.GetSectionItem(sectionItemID); err != nil {
		return nil, err
	}

	_, err := p.pool.Exec(p.ctx(), `
		INSERT INTO portfolio_item_visibility (portfolio_id, section_id, section_item_id, show_in_preview)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (portfolio_id, section_id, section_item_id) DO UPDATE SET
			show_in_preview = EXCLUDED.show_in_preview
	`, portfolioID, sectionID, sectionItemID, showInPreview)
	if err != nil {
		return nil, fmt.Errorf("update visibility: %w", err)
	}
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) AddPortfolioSectionItem(
	portfolioID, sectionID, headline, body string,
	metadata map[string]any,
) (*model.PortfolioWithContent, error) {
	ctx := p.ctx()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var linked bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM portfolio_sections WHERE portfolio_id = $1 AND section_id = $2
		)
	`, portfolioID, sectionID).Scan(&linked); err != nil {
		return nil, err
	}
	if !linked {
		if _, err := p.GetPortfolio(portfolioID); err != nil {
			return nil, err
		}
		if _, err := p.getSectionTx(ctx, tx, sectionID); err != nil {
			return nil, err
		}
		var maxSort int
		_ = tx.QueryRow(ctx, `
			SELECT COALESCE(MAX(sort_order), -1) FROM portfolio_sections WHERE portfolio_id = $1
		`, portfolioID).Scan(&maxSort)
		_, err = tx.Exec(ctx, `
			INSERT INTO portfolio_sections (portfolio_id, section_id, sort_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (portfolio_id, section_id) DO NOTHING
		`, portfolioID, sectionID, maxSort+1)
		if err != nil {
			return nil, fmt.Errorf("link section to portfolio: %w", err)
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

	_, err = tx.Exec(ctx, `UPDATE portfolios SET updated_at = $2 WHERE id = $1`, portfolioID, now)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE sections SET updated_at = $2 WHERE id = $1`, sectionID, now)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_item_visibility (portfolio_id, section_id, section_item_id, show_in_preview)
		VALUES ($1, $2, $3, true)
		ON CONFLICT (portfolio_id, section_id, section_item_id) DO UPDATE SET show_in_preview = true
	`, portfolioID, sectionID, itemID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_item_visibility (portfolio_id, section_id, section_item_id, show_in_preview)
		SELECT ps.portfolio_id, $2, $3, false
		FROM portfolio_sections ps
		WHERE ps.section_id = $2 AND ps.portfolio_id <> $1
		ON CONFLICT (portfolio_id, section_id, section_item_id) DO UPDATE SET show_in_preview = EXCLUDED.show_in_preview
	`, portfolioID, sectionID, itemID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) UpdatePortfolioSectionItem(
	portfolioID, sectionID, sectionItemID string,
	headline, body *string,
	metadata map[string]any,
) (*model.PortfolioWithContent, error) {
	ctx := p.ctx()
	item, err := p.GetSectionItem(sectionItemID)
	if err != nil {
		return nil, err
	}
	if _, err := p.GetPortfolio(portfolioID); err != nil {
		return nil, err
	}

	if headline != nil {
		item.Headline = strings.TrimSpace(*headline)
	}
	if body != nil {
		item.Body = strings.TrimSpace(*body)
	}
	if metadata != nil {
		if item.Metadata == nil {
			item.Metadata = map[string]any{}
		}
		for k, v := range metadata {
			if v != nil {
				item.Metadata[k] = v
			}
		}
	}

	now := time.Now().UTC()
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
	_, err = tx.Exec(ctx, `UPDATE portfolios SET updated_at = $2 WHERE id = $1`, portfolioID, now)
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
	return p.PortfolioWithContent(portfolioID)
}

func (p *Postgres) UpdatePortfolioContactProfile(
	portfolioID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL *string,
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
	profile.UpdatedAt = formatTime(now)

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	createdAt := profile.CreatedAt
	_, err = tx.Exec(ctx, `
		INSERT INTO contact_profiles (id, workspace_id, full_name, headline, email, phone, location, website, linked_in, github, photo_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz)
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
			updated_at = EXCLUDED.updated_at
	`, profile.ID, profile.WorkspaceID, profile.FullName, profile.Headline, profile.Email,
		profile.Phone, profile.Location, profile.Website, profile.LinkedIn, profile.Github, profile.PhotoURL,
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

	rows, err := p.pool.Query(p.ctx(), `
		SELECT ps.section_id, ps.sort_order
		FROM portfolio_sections ps
		JOIN sections s ON s.id = ps.section_id
		WHERE ps.portfolio_id = $1
		ORDER BY ps.sort_order
	`, portfolioID)
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
		items, err := p.sectionItemsForSectionWithPortfolioVisibility(portfolioID, sectionID)
		if err != nil {
			return nil, err
		}
		sectionsWithItems = append(sectionsWithItems, &model.SectionWithItems{
			Section: section,
			Items:   items,
		})
	}

	return &model.PortfolioWithContent{
		Portfolio:      portfolio,
		ContactProfile: contact,
		Settings:       settings,
		Theme:          theme,
		Sections:       sectionsWithItems,
	}, nil
}

func (p *Postgres) sectionItemsForSectionWithPortfolioVisibility(portfolioID, sectionID string) ([]*model.SectionItem, error) {
	rows, err := p.pool.Query(p.ctx(), `
		SELECT si.id, si.workspace_id, si.type, si.headline, si.body, si.metadata,
		       si.created_by, si.created_at, si.updated_at, sil.sort_order,
		       COALESCE(piv.show_in_preview, false)
		FROM section_item_links sil
		JOIN section_items si ON si.id = sil.section_item_id
		LEFT JOIN portfolio_item_visibility piv
			ON piv.portfolio_id = $1 AND piv.section_id = $2 AND piv.section_item_id = si.id
		WHERE sil.section_id = $2
		ORDER BY sil.sort_order
	`, portfolioID, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*model.SectionItem, 0)
	for rows.Next() {
		var item model.SectionItem
		var itemType string
		var metadata []byte
		var createdAt, updatedAt time.Time
		var sortOrder int
		var showInPreview bool
		if err := rows.Scan(
			&item.ID, &item.WorkspaceID, &itemType, &item.Headline, &item.Body, &metadata,
			&item.CreatedBy, &createdAt, &updatedAt, &sortOrder, &showInPreview,
		); err != nil {
			return nil, err
		}
		item.Type = model.SectionType(itemType)
		item.Metadata = parseJSONMap(metadata)
		item.ShowInPreview = showInPreview
		item.CreatedAt = formatTime(createdAt)
		item.UpdatedAt = formatTime(updatedAt)
		items = append(items, withDefaultShowInPreview(&item))
	}
	return items, nil
}

func (p *Postgres) PortfoliosForSection(sectionID string) ([]*model.Portfolio, error) {
	if _, err := p.GetSection(sectionID); err != nil {
		return nil, err
	}
	rows, err := p.pool.Query(p.ctx(), `
		SELECT pf.id, pf.workspace_id, pf.title, pf.contact_profile_id, pf.created_by, pf.created_at, pf.updated_at
		FROM portfolio_sections ps
		JOIN portfolios pf ON pf.id = ps.portfolio_id
		WHERE ps.section_id = $1
	`, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPortfolios(rows), nil
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
		INSERT INTO portfolios (id, workspace_id, title, contact_profile_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
	`, newPortfolio.ID, newPortfolio.WorkspaceID, newPortfolio.Title, newPortfolio.ContactProfileID,
		newPortfolio.CreatedBy, now)
	if err != nil {
		return nil, err
	}

	settings := p.GetPortfolioSettings(sourceID)
	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_settings (portfolio_id, theme_id, font_size, page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, newID, settings.ThemeID, string(settings.FontSize), string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_sections (portfolio_id, section_id, sort_order)
		SELECT $1, section_id, sort_order FROM portfolio_sections WHERE portfolio_id = $2
	`, newID, sourceID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_item_visibility (portfolio_id, section_id, section_item_id, show_in_preview)
		SELECT $1, section_id, section_item_id, show_in_preview
		FROM portfolio_item_visibility WHERE portfolio_id = $2
	`, newID, sourceID)
	if err != nil {
		return nil, err
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
		INSERT INTO portfolios (id, workspace_id, title, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
	`, portfolio.ID, portfolio.WorkspaceID, portfolio.Title, portfolio.CreatedBy, now)
	if err != nil {
		return portfolio
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_settings (portfolio_id, theme_id, font_size, page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, locale)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, settings.PortfolioID, settings.ThemeID, string(settings.FontSize), string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto, settings.Locale)
	if err != nil {
		return portfolio
	}

	sections, err := p.ensureWorkspacePortfolioSectionsTx(ctx, tx)
	if err != nil {
		return portfolio
	}
	for i, section := range sections {
		_, err = tx.Exec(ctx, `
			INSERT INTO portfolio_sections (portfolio_id, section_id, sort_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (portfolio_id, section_id) DO NOTHING
		`, portfolio.ID, section.ID, i)
		if err != nil {
			return portfolio
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO portfolio_item_visibility (portfolio_id, section_id, section_item_id, show_in_preview)
		SELECT $1, sil.section_id, sil.section_item_id, false
		FROM portfolio_sections ps
		JOIN section_item_links sil ON sil.section_id = ps.section_id
		WHERE ps.portfolio_id = $1
		ON CONFLICT (portfolio_id, section_id, section_item_id) DO NOTHING
	`, portfolio.ID)
	if err != nil {
		return portfolio
	}

	_ = tx.Commit(ctx)
	return portfolio
}

func (p *Postgres) ensureWorkspacePortfolioSectionsTx(ctx context.Context, tx pgx.Tx) ([]*model.Section, error) {
	specs := portfolioDefaultSectionSpecs()

	sections := make([]*model.Section, 0, len(specs))
	workspaceID := p.activeWorkspaceID()
	userID := p.activeUserID()
	now := time.Now().UTC()

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

func scanPortfolio(row scannable) (*model.Portfolio, error) {
	var pf model.Portfolio
	var createdAt, updatedAt time.Time
	if err := row.Scan(&pf.ID, &pf.WorkspaceID, &pf.Title, &pf.ContactProfileID, &pf.CreatedBy, &createdAt, &updatedAt); err != nil {
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
		if err := rows.Scan(&pf.ID, &pf.WorkspaceID, &pf.Title, &pf.ContactProfileID, &pf.CreatedBy, &createdAt, &updatedAt); err != nil {
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
	var fontSize, pageFormat string
	if err := row.Scan(&s.PortfolioID, &s.ThemeID, &fontSize, &pageFormat, &s.MarginHorizontalMm, &s.MarginVerticalMm, &s.ShowPhoto, &s.Locale); err != nil {
		return nil, err
	}
	s.FontSize = model.FontSize(fontSize)
	s.PageFormat = model.PageFormat(pageFormat)
	return clonePortfolioSettings(&s), nil
}
