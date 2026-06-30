package llm

import (
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestSystemPromptIncludesRoleTailorWorkflow(t *testing.T) {
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{View: model.AssistantViewResumes}, "", false, "")
	required := []string{
		"Role-targeted CV workflow",
		"web_search",
		"Recruiter review",
		"Gap check",
		"add_section_item",
		"get_resume_content",
	}
	for _, phrase := range required {
		if !strings.Contains(prompt, phrase) {
			t.Fatalf("expected system prompt to include %q", phrase)
		}
	}
}
