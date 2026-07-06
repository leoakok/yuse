package store

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
)

// Regression: public resume fetch must load the same settings row as the authenticated path.
// getResumeSettingsUnscoped must use resumeSettingsSelectSQL (includes locale); a drifted
// inline SELECT caused scanResumeSettings to fail and silently return defaults.
func TestPostgresPublicResumeSettingsMatchScopedFetch(t *testing.T) {
	pool := testPool(t)
	pg := NewPostgres(pool)
	ctx := context.Background()

	var resumeID string
	err := pool.QueryRow(ctx, `
		SELECT rs.resume_id
		FROM resume_settings rs
		WHERE rs.font_family != 'SANS'
		   OR rs.design_preset_id != 'MODERN'
		   OR rs.accent_color NOT IN ('', '#c45c3e')
		LIMIT 1
	`).Scan(&resumeID)
	if errors.Is(err, pgx.ErrNoRows) {
		t.Skip("no customized resume settings in database")
	}
	if err != nil {
		t.Fatalf("query resume: %v", err)
	}

	scoped := pg.GetResumeSettings(resumeID)

	var username, slug string
	err = pool.QueryRow(ctx, `
		SELECT u.username, r.slug
		FROM resumes r
		JOIN users u ON u.id = r.created_by
		WHERE r.id = $1 AND u.username IS NOT NULL AND r.slug IS NOT NULL
	`, resumeID).Scan(&username, &slug)
	if errors.Is(err, pgx.ErrNoRows) {
		t.Skip("customized resume is not publicly shared")
	}
	if err != nil {
		t.Fatalf("query public slug: %v", err)
	}

	public, err := pg.PublicResumeWithContent(username, &slug)
	if err != nil {
		t.Fatalf("PublicResumeWithContent: %v", err)
	}
	if public.Settings == nil {
		t.Fatal("expected settings on public resume")
	}
	if public.Settings.FontFamily != scoped.FontFamily {
		t.Fatalf("fontFamily: public %q scoped %q", public.Settings.FontFamily, scoped.FontFamily)
	}
	if public.Settings.DesignPresetID != scoped.DesignPresetID {
		t.Fatalf("designPresetId: public %q scoped %q", public.Settings.DesignPresetID, scoped.DesignPresetID)
	}
	if public.Settings.AccentColor != scoped.AccentColor {
		t.Fatalf("accentColor: public %q scoped %q", public.Settings.AccentColor, scoped.AccentColor)
	}
}
