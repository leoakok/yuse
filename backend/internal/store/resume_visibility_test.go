package store_test

import (
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestCreateResumeShowsWorkspaceItemsHiddenFromPreview(t *testing.T) {
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)

	first, err := cvSvc.GetResumeWithContent("resume-swe")
	if err != nil {
		t.Fatalf("GetResumeWithContent first: %v", err)
	}
	firstItemCount := countItems(first)
	if countVisibleItems(first) == 0 {
		t.Fatal("expected seeded first resume to have visible items")
	}

	second := cvSvc.CreateResume("Second CV")
	content, err := cvSvc.GetResumeWithContent(second.ID)
	if err != nil {
		t.Fatalf("GetResumeWithContent second: %v", err)
	}
	if countItems(content) != firstItemCount {
		t.Fatalf("expected new resume to list all workspace items (%d), got %d", firstItemCount, countItems(content))
	}
	if countVisibleItems(content) != 0 {
		t.Fatalf("expected new resume to hide all items from preview, got %d visible", countVisibleItems(content))
	}
	if len(content.Sections) == 0 {
		t.Fatal("expected default sections to be linked on new resume")
	}
}

func countItems(content *model.ResumeWithContent) int {
	total := 0
	for _, swi := range content.Sections {
		total += len(swi.Items)
	}
	return total
}

func countVisibleItems(content *model.ResumeWithContent) int {
	total := 0
	for _, swi := range content.Sections {
		for _, item := range swi.Items {
			if item.ShowInPreview {
				total++
			}
		}
	}
	return total
}
