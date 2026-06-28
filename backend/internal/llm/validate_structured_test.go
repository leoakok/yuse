package llm

import (
	"testing"

	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func TestShouldNudgeThinStructuredFields(t *testing.T) {
	execs := []mcp.Execution{{
		Tool: "add_section_item",
		Result: map[string]any{
			"fieldHints": []string{"missing required field company"},
		},
	}}
	if !shouldNudgeThinStructuredFields(execs, "Added your experience.") {
		t.Fatal("expected nudge when fieldHints present")
	}
	if shouldNudgeThinStructuredFields(execs, "What company was that at?") {
		t.Fatal("should not nudge when reply is a clarification question")
	}
}

func TestStructuredFieldsNudgeMessageIncludesHints(t *testing.T) {
	execs := []mcp.Execution{{
		Tool: "add_section_item",
		Result: map[string]any{
			"fieldHints": []string{"move dates from body to startDate/endDate"},
		},
	}}
	msg := structuredFieldsNudgeMessage(execs)
	if msg == "" || msg == thinStructuredFieldsNudge {
		t.Fatalf("expected hints appended to nudge, got: %q", msg)
	}
}
