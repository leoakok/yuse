package cv_test

import (
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func ptr[T any](v T) *T { return &v }

func TestUpdateResumeSettingsDesignFieldsRoundTrip(t *testing.T) {
	dataStore := store.NewMemory()
	svc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)

	content, err := svc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	resumeID := content.Resume.ID

	maxItems := 3
	input := model.UpdateResumeSettingsInput{
		ResumeID:               resumeID,
		PageFormat:             ptr(model.PageFormatLetter),
		ThemeID:                ptr("theme-classic"),
		ShowPhoto:              ptr(true),
		ItemTitleLayout:        ptr(model.ItemTitleLayoutInline),
		ItemTitleSeparator:     ptr(model.ItemTitleSeparatorPipe),
		ItemTitleOrder:         ptr(model.ItemTitleOrderCompanyFirst),
		FontFamily:             ptr(model.FontFamilySerif),
		AccentColor:            ptr("#ff0000"),
		SectionDividerStyle:    ptr(model.SectionDividerStyleTextWidth),
		DateFormat:             ptr(model.DateFormatMmYyyy),
		DatePosition:           ptr(model.DatePositionBelow),
		SkillsLayout:           ptr(model.SkillsLayoutTags),
		AtsMode:                ptr(true),
		ColumnLayout:           ptr(model.ColumnLayoutTwoColumn),
		SidebarPosition:        ptr(model.SidebarPositionRight),
		SidebarWidth:           ptr(model.SidebarWidthWide),
		DesignPresetID:         ptr(model.DesignPresetIDCreative),
		PhotoPosition:          ptr(model.PhotoPositionSidebar),
		PhotoSize:              ptr(model.PhotoSizeL),
		ContactLayout:          ptr(model.ContactLayoutStacked),
		ContactFields:          []model.ContactField{model.ContactFieldEmail, model.ContactFieldLinkedin},
		MarginHorizontalMm:     ptr(15.0),
		MarginVerticalMm:       ptr(18.0),
		SectionSpacing:         ptr(model.SpacingDensityCompact),
		ItemSpacing:            ptr(model.SpacingDensityAiry),
		DescriptionStyle:       ptr(model.DescriptionStyleParagraph),
		BulletChar:             ptr(model.BulletCharDash),
		ItemTitleEmphasis:      ptr(model.ItemTitleEmphasisCompany),
		HighlightCurrentRole:     ptr(true),
		LocationDisplay:        ptr(model.LocationDisplayInlineWithCompany),
		HeadingFontFamily:      ptr(model.FontFamilyMono),
		BodyFontFamily:         ptr(model.FontFamilySans),
		NameFontWeight:         ptr(model.FontWeightRoleLight),
		SectionTitleFontWeight: ptr(model.FontWeightRoleMedium),
		LineHeight:             ptr(model.LineHeightDensityRelaxed),
		HeadingLetterSpacing:   ptr(model.LetterSpacingDensityTight),
		SectionTitleCase:       ptr(model.SectionTitleCaseUppercase),
		TextPrimaryColor:       ptr("#111111"),
		TextMutedColor:         ptr("#666666"),
		PageBackground:         ptr(model.PageBackgroundOffWhite),
		LinkColor:              ptr("#0000ff"),
		SkillsProficiency:      ptr(model.SkillsProficiencyDots),
		LanguagesLayout:        ptr(model.LanguagesLayoutInline),
		CertificationsLayout:   ptr(model.CertificationsLayoutCompact),
		KeepSectionsTogether:   ptr(false),
		MaxItemsBeforeBreak:    &maxItems,
		FooterStyle:            ptr(model.FooterStylePageNumber),
		ExportFilenameTemplate: ptr("{name}-cv"),
		Locale:                 ptr("en-GB"),
	}

	updated, err := svc.UpdateResumeSettings(input)
	if err != nil {
		t.Fatalf("UpdateResumeSettings: %v", err)
	}

	if updated.PageFormat != model.PageFormatLetter {
		t.Errorf("PageFormat: got %v want LETTER", updated.PageFormat)
	}
	if updated.DesignPresetID != model.DesignPresetIDCreative {
		t.Errorf("DesignPresetID: got %v want CREATIVE", updated.DesignPresetID)
	}
	if updated.MaxItemsBeforeBreak == nil || *updated.MaxItemsBeforeBreak != 3 {
		t.Errorf("MaxItemsBeforeBreak: got %v want 3", updated.MaxItemsBeforeBreak)
	}

	reloaded, err := svc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if reloaded.Settings.AccentColor != "#ff0000" {
		t.Errorf("reload accent: got %q", reloaded.Settings.AccentColor)
	}
}

func TestUpdateResumeSectionAndItemVisibilityRoundTrip(t *testing.T) {
	dataStore := store.NewMemory()
	svc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)

	content, err := svc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	resumeID := content.Resume.ID
	if len(content.Sections) == 0 {
		t.Fatal("expected sections")
	}
	sectionID := content.Sections[0].Section.ID
	if len(content.Sections[0].Items) == 0 {
		t.Fatal("expected items")
	}
	itemID := content.Sections[0].Items[0].ID

	_, err = svc.UpdateResumeSectionVisibility(model.UpdateResumeSectionVisibilityInput{
		ResumeID: resumeID, SectionID: sectionID, ShowInPreview: true,
	})
	if err != nil {
		t.Fatalf("section visibility: %v", err)
	}

	_, err = svc.UpdateResumeSectionItemVisibility(model.UpdateResumeSectionItemVisibilityInput{
		ResumeID: resumeID, SectionID: sectionID, SectionItemID: itemID, ShowInPreview: true,
	})
	if err != nil {
		t.Fatalf("item visibility: %v", err)
	}

	reloaded, err := svc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	found := false
	for _, swi := range reloaded.Sections {
		if swi.Section.ID != sectionID {
			continue
		}
		if !swi.ShowInPreview {
			t.Error("section should be visible")
		}
		for _, item := range swi.Items {
			if item.ID == itemID {
				found = true
				if !item.ShowInPreview {
					t.Error("item should be visible")
				}
			}
		}
	}
	if !found {
		t.Fatal("item not found after visibility update")
	}
}
