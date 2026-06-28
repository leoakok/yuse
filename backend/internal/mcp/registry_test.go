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

func TestAddSectionItemPersists(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	sections := registry.Execute("list_sections", []byte(`{"type":"EXPERIENCE"}`))
	if sections.Error != "" {
		t.Fatalf("list_sections: %s", sections.Error)
	}
	sectionsRaw, _ := json.Marshal(sections.Result)
	var parsed []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(sectionsRaw, &parsed); err != nil || len(parsed) == 0 {
		t.Fatalf("expected experience sections: %v", err)
	}
	sectionID := parsed[0].ID

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": sectionID,
		"headline":  "Staff Engineer — Example Co",
		"body":      "- Built MCP integrations\n- Shipped CV assistant",
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error != "" {
		t.Fatalf("add_section_item: %s", exec.Error)
	}

	content := registry.Execute("get_resume_content", []byte(`{"id":"resume-swe"}`))
	if content.Error != "" {
		t.Fatalf("get_resume_content: %s", content.Error)
	}
	raw, _ := json.Marshal(content.Result)
	text := string(raw)
	if !strings.Contains(text, "Staff Engineer") || !strings.Contains(text, "MCP integrations") {
		t.Fatalf("expected new item in resume content, got: %s", raw)
	}
}

func TestUpdateContactProfileAcceptsAliases(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resume_id": "resume-swe",
		"name":      "Jane Doe",
		"title":     "Staff Engineer",
	})
	exec := registry.Execute("update_contact_profile", args)
	if exec.Error != "" {
		t.Fatalf("update_contact_profile: %s", exec.Error)
	}

	content, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if content.ContactProfile.FullName != "Jane Doe" {
		t.Fatalf("expected fullName Jane Doe, got %q", content.ContactProfile.FullName)
	}
	if content.ContactProfile.Headline == nil || *content.ContactProfile.Headline != "Staff Engineer" {
		t.Fatalf("expected headline Staff Engineer, got %+v", content.ContactProfile.Headline)
	}
}
