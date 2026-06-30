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

func educationSectionID(t *testing.T, registry *mcp.Registry) string {
	t.Helper()
	sections := registry.Execute("list_sections", []byte(`{"type":"EDUCATION"}`))
	if sections.Error != "" {
		t.Fatalf("list_sections: %s", sections.Error)
	}
	raw, _ := json.Marshal(sections.Result)
	var parsed []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil || len(parsed) == 0 {
		t.Fatalf("expected education sections: %v", err)
	}
	return parsed[0].ID
}

func TestAddEducationItemRejectsSectionTitleHeadline(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": educationSectionID(t, registry),
		"headline":  "Education",
		"body":      "- Bachelor of Science in Physics, University of Pennsylvania (1992-1997)",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error == "" {
		t.Fatal("expected validation error for section title headline")
	}
	if !strings.Contains(exec.Error, "degree") {
		t.Fatalf("expected degree hint, got: %s", exec.Error)
	}
}

func TestAddEducationItemAcceptsFlatFields(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":    "resume-swe",
		"sectionId":   educationSectionID(t, registry),
		"headline":    "Master of Science in CS",
		"institution": "Stanford University",
		"startDate":   "2018",
		"endDate":     "2020",
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
		if swi.Section.Type != "EDUCATION" {
			continue
		}
		for _, item := range swi.Items {
			if item.Headline == "Master of Science in CS" {
				if item.Metadata["institution"] != "Stanford University" {
					t.Fatalf("expected institution from flat field, got %+v", item.Metadata)
				}
				if item.Metadata["startDate"] != "2018" {
					t.Fatalf("expected startDate from flat field, got %+v", item.Metadata)
				}
				return
			}
		}
	}
	t.Fatal("expected flat-field education item")
}

func TestAddEducationItemAcceptsStructuredFields(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": educationSectionID(t, registry),
		"headline":  "Bachelor of Science in Physics",
		"metadata": map[string]any{
			"institution": "University of Pennsylvania",
			"startDate":   "1992",
			"endDate":     "1997",
		},
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
		if swi.Section.Type != "EDUCATION" {
			continue
		}
		for _, item := range swi.Items {
			if item.Headline == "Bachelor of Science in Physics" {
				if item.Metadata["institution"] != "University of Pennsylvania" {
					t.Fatalf("expected institution metadata, got %+v", item.Metadata)
				}
				return
			}
		}
	}
	t.Fatal("expected structured education item")
}

func TestGetResumeContentIncludesFieldGuideAndMetadata(t *testing.T) {
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
	if !strings.Contains(text, "fieldGuide") {
		t.Fatalf("expected fieldGuide in resume content summary, got: %s", raw)
	}
}
