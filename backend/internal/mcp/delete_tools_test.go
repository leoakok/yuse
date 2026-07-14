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

func TestDeleteResumeRemovesCV(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc, false)

	list := registry.Execute("list_resumes", []byte(`{}`))
	if list.Error != "" {
		t.Fatalf("list_resumes: %s", list.Error)
	}
	raw, _ := json.Marshal(list.Result)
	var resumes []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &resumes); err != nil || len(resumes) == 0 {
		t.Fatalf("expected resumes: %v", err)
	}
	targetID := resumes[0].ID

	del := registry.Execute("delete_resume", mustJSON(map[string]any{"id": targetID}))
	if del.Error != "" {
		t.Fatalf("delete_resume: %s", del.Error)
	}

	after := registry.Execute("list_resumes", []byte(`{}`))
	afterRaw, _ := json.Marshal(after.Result)
	var remaining []struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(afterRaw, &remaining)
	for _, r := range remaining {
		if r.ID == targetID {
			t.Fatalf("resume %s still listed after delete", targetID)
		}
	}
}

func TestDeleteSectionItemAndBulkClear(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	registry := mcp.NewRegistry(cvSvc, false)

	sections := registry.Execute("list_sections", []byte(`{"type":"SKILLS"}`))
	if sections.Error != "" {
		t.Fatalf("list_sections: %s", sections.Error)
	}
	sectionsRaw, _ := json.Marshal(sections.Result)
	var parsed []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(sectionsRaw, &parsed); err != nil || len(parsed) == 0 {
		t.Fatalf("expected skills sections: %v", err)
	}
	sectionID := parsed[0].ID

	addArgs := mustJSON(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": sectionID,
		"headline":  "Rust",
		"metadata":  map[string]any{"level": "PROFICIENT"},
	})
	add := registry.Execute("add_section_item", addArgs)
	if add.Error != "" {
		t.Fatalf("add_section_item: %s", add.Error)
	}

	content := registry.Execute("get_resume_content", []byte(`{"id":"resume-swe"}`))
	if content.Error != "" {
		t.Fatalf("get_resume_content: %s", content.Error)
	}
	contentRaw, _ := json.Marshal(content.Result)
	var summary struct {
		Sections []struct {
			Items []struct {
				ID       string `json:"id"`
				Headline string `json:"headline"`
			} `json:"items"`
		} `json:"sections"`
	}
	if err := json.Unmarshal(contentRaw, &summary); err != nil {
		t.Fatalf("parse content: %v", err)
	}
	var itemID string
	for _, section := range summary.Sections {
		for _, item := range section.Items {
			if item.Headline == "Rust" {
				itemID = item.ID
				break
			}
		}
	}
	if itemID == "" {
		t.Fatal("expected Rust skill item id")
	}

	delOne := registry.Execute("delete_section_item", mustJSON(map[string]any{
		"resumeId":      "resume-swe",
		"sectionItemId": itemID,
	}))
	if delOne.Error != "" {
		t.Fatalf("delete_section_item: %s", delOne.Error)
	}

	add2 := registry.Execute("add_section_item", mustJSON(map[string]any{
		"resumeId":  "resume-swe",
		"sectionId": sectionID,
		"headline":  "Go",
	}))
	if add2.Error != "" {
		t.Fatalf("add_section_item go: %s", add2.Error)
	}

	bulk := registry.Execute("delete_all_section_items", mustJSON(map[string]any{
		"type": "SKILLS",
	}))
	if bulk.Error != "" {
		t.Fatalf("delete_all_section_items: %s", bulk.Error)
	}
	bulkRaw, _ := json.Marshal(bulk.Result)
	var bulkResult struct {
		DeletedCount int `json:"deletedCount"`
	}
	if err := json.Unmarshal(bulkRaw, &bulkResult); err != nil {
		t.Fatalf("parse bulk result: %v", err)
	}
	if bulkResult.DeletedCount < 1 {
		t.Fatalf("expected at least one deleted item, got %d", bulkResult.DeletedCount)
	}
}

func mustJSON(v map[string]any) []byte {
	raw, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return raw
}
