package mcp_test

import (
	"encoding/json"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestUpdateResumeSettingsAllDesignFields(t *testing.T) {
	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":               "resume-swe",
		"designPresetId":         "CREATIVE",
		"accentColor":            "#059669",
		"fontFamily":             "SERIF",
		"itemTitleSeparator":     "PIPE",
		"itemTitleOrder":         "COMPANY_FIRST",
		"dateFormat":             "MM_YYYY",
		"datePosition":           "BELOW",
		"skillsLayout":           "TAGS",
		"atsMode":                true,
		"photoPosition":          "SIDEBAR",
		"photoSize":              "L",
		"contactLayout":          "STACKED",
		"contactFields":          []string{"EMAIL", "LINKEDIN"},
		"sectionSpacing":         "AIRY",
		"bulletChar":             "DASH",
		"exportFilenameTemplate": "{name}-cv",
	})
	exec := registry.Execute("update_resume_settings", args)
	if exec.Error != "" {
		t.Fatalf("update_resume_settings: %s", exec.Error)
	}

	settings, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if settings.Settings.DesignPresetID != "CREATIVE" {
		t.Fatalf("designPresetId: got %q", settings.Settings.DesignPresetID)
	}
	if settings.Settings.AccentColor != "#059669" {
		t.Fatalf("accentColor: got %q", settings.Settings.AccentColor)
	}
	if !settings.Settings.AtsMode {
		t.Fatal("expected atsMode true")
	}
	if settings.Settings.ExportFilenameTemplate != "{name}-cv" {
		t.Fatalf("exportFilenameTemplate: got %q", settings.Settings.ExportFilenameTemplate)
	}
}

func TestReorderResumeSections(t *testing.T) {
	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	content, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if len(content.Sections) < 2 {
		t.Fatal("expected at least 2 sections")
	}
	first := content.Sections[0].Section.ID
	second := content.Sections[1].Section.ID
	sectionIDs := make([]string, 0, len(content.Sections))
	sectionIDs = append(sectionIDs, second, first)
	for i := 2; i < len(content.Sections); i++ {
		sectionIDs = append(sectionIDs, content.Sections[i].Section.ID)
	}

	args, _ := json.Marshal(map[string]any{
		"resumeId":   "resume-swe",
		"sectionIds": sectionIDs,
	})
	exec := registry.Execute("reorder_resume_sections", args)
	if exec.Error != "" {
		t.Fatalf("reorder_resume_sections: %s", exec.Error)
	}

	updated, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent after reorder: %v", err)
	}
	if updated.Sections[0].Section.ID != second {
		t.Fatalf("expected first section %s, got %s", second, updated.Sections[0].Section.ID)
	}
}

func TestSetSectionVisibilityAndDisplayTitle(t *testing.T) {
	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	content, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	sectionID := content.Sections[0].Section.ID

	hideArgs, _ := json.Marshal(map[string]any{
		"resumeId":      "resume-swe",
		"sectionId":     sectionID,
		"showInPreview": false,
	})
	if exec := registry.Execute("set_section_visibility", hideArgs); exec.Error != "" {
		t.Fatalf("set_section_visibility: %s", exec.Error)
	}

	titleArgs, _ := json.Marshal(map[string]any{
		"resumeId":     "resume-swe",
		"sectionId":    sectionID,
		"displayTitle": "Custom Heading",
	})
	if exec := registry.Execute("update_section_display_title", titleArgs); exec.Error != "" {
		t.Fatalf("update_section_display_title: %s", exec.Error)
	}

	updated, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	for _, swi := range updated.Sections {
		if swi.Section.ID != sectionID {
			continue
		}
		if swi.ShowInPreview {
			t.Fatal("expected section hidden")
		}
		if swi.DisplayTitle == nil || *swi.DisplayTitle != "Custom Heading" {
			t.Fatalf("displayTitle: got %+v", swi.DisplayTitle)
		}
		return
	}
	t.Fatalf("section %s not found", sectionID)
}

func TestGetResumeContentIncludesDesignSettings(t *testing.T) {
	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	exec := registry.Execute("get_resume_content", []byte(`{"id":"resume-swe"}`))
	if exec.Error != "" {
		t.Fatalf("get_resume_content: %s", exec.Error)
	}
	raw, _ := json.Marshal(exec.Result)
	var parsed map[string]any
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := parsed["designSettings"]; !ok {
		t.Fatalf("expected designSettings in summary, got keys %v", parsed)
	}
	sections, ok := parsed["sections"].([]any)
	if !ok || len(sections) == 0 {
		t.Fatal("expected sections array")
	}
	first, ok := sections[0].(map[string]any)
	if !ok {
		t.Fatal("expected section object")
	}
	if _, ok := first["showInPreview"]; !ok {
		t.Fatal("expected showInPreview on section")
	}
}
