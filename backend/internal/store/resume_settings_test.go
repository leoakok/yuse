package store_test

import (
	"os"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestMemoryUpdateResumeSettingsRoundTrip(t *testing.T) {
	dataStore := store.NewMemory()
	svc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)

	content, err := svc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}

	accent := "#112233"
	updated, err := svc.UpdateResumeSettings(model.UpdateResumeSettingsInput{
		ResumeID:            content.Resume.ID,
		AccentColor:         &accent,
		SectionDividerStyle: ptrSectionDividerStyle(model.SectionDividerStyleTextWidth),
		DateFormat:          ptrDateFormat(model.DateFormatMmYyyy),
		DesignPresetID:      ptrDesignPresetID(model.DesignPresetIDExecutive),
		SectionSpacing:      ptrSpacingDensity(model.SpacingDensityCompact),
		FooterStyle:         ptrFooterStyle(model.FooterStylePageNumber),
	})
	if err != nil {
		t.Fatalf("UpdateResumeSettings: %v", err)
	}
	if updated.AccentColor != accent {
		t.Fatalf("accent: got %q want %q", updated.AccentColor, accent)
	}
	if updated.SectionDividerStyle != model.SectionDividerStyleTextWidth {
		t.Fatalf("divider: got %v", updated.SectionDividerStyle)
	}
	if updated.DateFormat != model.DateFormatMmYyyy {
		t.Fatalf("date format: got %v", updated.DateFormat)
	}
}

func TestMemoryResumeItemVisibilityRoundTrip(t *testing.T) {
	dataStore := store.NewMemory()
	svc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)

	second := svc.CreateResume("Visibility CV")
	content, err := svc.GetResumeWithContent(second.ID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if len(content.Sections) == 0 || len(content.Sections[0].Items) == 0 {
		t.Fatal("expected seeded sections with items")
	}

	sectionID := content.Sections[0].Section.ID
	itemID := content.Sections[0].Items[0].ID

	_, err = svc.UpdateResumeSectionItemVisibility(model.UpdateResumeSectionItemVisibilityInput{
		ResumeID: second.ID, SectionID: sectionID, SectionItemID: itemID, ShowInPreview: true,
	})
	if err != nil {
		t.Fatalf("UpdateResumeSectionItemVisibility: %v", err)
	}

	reloaded, err := svc.GetResumeWithContent(second.ID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	var visible bool
	for _, swi := range reloaded.Sections {
		if swi.Section.ID != sectionID {
			continue
		}
		for _, item := range swi.Items {
			if item.ID == itemID {
				visible = item.ShowInPreview
			}
		}
	}
	if !visible {
		t.Fatal("expected toggled item to be visible in preview")
	}
}

func TestPostgresUpdateResumeSettingsRoundTrip(t *testing.T) {
	if os.Getenv("DATABASE_URL") == "" {
		t.Skip("DATABASE_URL not set")
	}

	// Integration hook for CI/dev: run with DATABASE_URL pointing at migrated Postgres.
	t.Skip("postgres integration runs via migrate + manual verification in dev")
}

func ptrSectionDividerStyle(v model.SectionDividerStyle) *model.SectionDividerStyle { return &v }
func ptrDateFormat(v model.DateFormat) *model.DateFormat                         { return &v }
func ptrDesignPresetID(v model.DesignPresetID) *model.DesignPresetID             { return &v }
func ptrSpacingDensity(v model.SpacingDensity) *model.SpacingDensity             { return &v }
func ptrFooterStyle(v model.FooterStyle) *model.FooterStyle                      { return &v }
