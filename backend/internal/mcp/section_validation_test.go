package mcp_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func experienceSectionID(t *testing.T, registry *mcp.Registry) string {
	t.Helper()
	sections := registry.Execute("list_sections", []byte(`{"type":"EXPERIENCE"}`))
	if sections.Error != "" {
		t.Fatalf("list_sections: %s", sections.Error)
	}
	raw, _ := json.Marshal(sections.Result)
	var parsed []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil || len(parsed) == 0 {
		t.Fatalf("expected experience sections: %v", err)
	}
	return parsed[0].ID
}

func TestAddExperienceItemRejectsMetadataDumpInBody(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": experienceSectionID(t, registry),
		"headline":  "Senior Engineer",
		"body":      "Acme Corp, San Francisco\n2020-2023\n- Built APIs",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error == "" {
		t.Fatal("expected validation error for metadata dump in body")
	}
	if !strings.Contains(exec.Error, "company") {
		t.Fatalf("expected company hint, got: %s", exec.Error)
	}
}

func TestAddExperienceItemAcceptsStructuredFields(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":   "resume-swe",
		"sectionId":  experienceSectionID(t, registry),
		"headline":   "Staff Engineer",
		"company":    "Acme Corp",
		"location":   "Remote",
		"startDate":  "2020-06",
		"endDate":    "2023-12",
		"body":       "- Led checkout rewrite\n- Cut latency 40%",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error != "" {
		t.Fatalf("add_section_item: %s", exec.Error)
	}

	raw, _ := json.Marshal(exec.Result)
	text := string(raw)
	if !strings.Contains(text, "fieldHints") {
		t.Fatalf("expected fieldHints in result, got: %s", raw)
	}
	if strings.Contains(text, "missing required field company") {
		t.Fatalf("unexpected company hint for structured write: %s", raw)
	}
}

func TestAddExperienceItemReturnsHintsWhenFieldsMissing(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": experienceSectionID(t, registry),
		"headline":  "Engineer",
		"body":      "- Shipped features",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error != "" {
		t.Fatalf("add_section_item: %s", exec.Error)
	}

	raw, _ := json.Marshal(exec.Result)
	text := string(raw)
	if !strings.Contains(text, "missing required field company") {
		t.Fatalf("expected company field hint, got: %s", raw)
	}
}

func TestNormalizeSplitsHeadlineAtCompany(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": experienceSectionID(t, registry),
		"headline":  "Senior Engineer at Acme Corp",
		"startDate": "2020",
		"endDate":   "2023",
		"body":      "- Built APIs",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error != "" {
		t.Fatalf("add_section_item: %s", exec.Error)
	}

	content, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	for _, swi := range content.Sections {
		if swi.Section.Type != "EXPERIENCE" {
			continue
		}
		for _, item := range swi.Items {
			if item.Headline == "Senior Engineer" {
				if item.Metadata["company"] != "Acme Corp" {
					t.Fatalf("expected normalized company, got %+v", item.Metadata)
				}
				return
			}
		}
	}
	t.Fatal("expected normalized experience item")
}

func TestGetResumeContentStructuredFieldGuide(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	content := registry.Execute("get_resume_content", []byte(`{"id":"resume-swe"}`))
	if content.Error != "" {
		t.Fatalf("get_resume_content: %s", content.Error)
	}
	raw, _ := json.Marshal(content.Result)
	text := string(raw)
	if !strings.Contains(text, `"required"`) {
		t.Fatalf("expected structured fieldGuide with required fields, got: %s", raw)
	}
	if !strings.Contains(text, "goodExample") {
		t.Fatalf("expected goodExample in fieldGuide, got: %s", text)
	}
}
