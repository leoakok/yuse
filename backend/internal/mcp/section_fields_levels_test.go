package mcp_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/sectionmeta"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func skillsSectionID(t *testing.T, registry *mcp.Registry) string {
	t.Helper()
	sections := registry.Execute("list_sections", []byte(`{"type":"SKILLS"}`))
	if sections.Error != "" {
		t.Fatalf("list_sections: %s", sections.Error)
	}
	raw, _ := json.Marshal(sections.Result)
	var parsed []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil || len(parsed) == 0 {
		t.Fatalf("expected skills sections: %v", err)
	}
	return parsed[0].ID
}

func TestAddSkillItemRejectsCommaListHeadline(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": skillsSectionID(t, registry),
		"headline":  "TypeScript, Go, React",
		"level":     sectionmeta.SkillLevelProficient,
	})
	exec := registry.Execute("add_section_item", args)
	if exec.Error == "" {
		t.Fatal("expected validation error for comma-separated skill headline")
	}
	if !strings.Contains(exec.Error, "one skill per item") {
		t.Fatalf("expected per-skill hint, got: %s", exec.Error)
	}
}

func TestAddSkillItemAcceptsLevelMetadata(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": skillsSectionID(t, registry),
		"headline":  "GraphQL",
		"level":     sectionmeta.SkillLevelAdvanced,
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
		if swi.Section.Type != "SKILLS" {
			continue
		}
		for _, item := range swi.Items {
			if item.Headline == "GraphQL" {
				if item.Metadata["level"] != sectionmeta.SkillLevelAdvanced {
					t.Fatalf("expected level metadata, got %+v", item.Metadata)
				}
				return
			}
		}
	}
	t.Fatal("expected GraphQL skill item")
}
