package llm

import (
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func TestParseRecruiterReviewJSON(t *testing.T) {
	raw := `{"score": 55, "fitAssessment": "partial fit", "gaps": ["missing customer-facing"], "fixes": [{"sectionType": "SUMMARY", "issue": "generic", "suggestion": "mention FDE"}], "passed": false}`
	result, err := parseRecruiterReviewJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if result.Score != 55 {
		t.Fatalf("expected score 55, got %d", result.Score)
	}
	if len(result.Fixes) != 1 {
		t.Fatalf("expected 1 fix, got %d", len(result.Fixes))
	}
}

func TestParseRecruiterReviewJSONAutoPass(t *testing.T) {
	raw := `{"score": 85, "fitAssessment": "strong fit", "gaps": [], "fixes": [], "passed": false}`
	result, err := parseRecruiterReviewJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Passed {
		t.Fatal("expected auto-pass when score high and no fixes")
	}
}

func TestRecruiterReviewNudge(t *testing.T) {
	msg := recruiterReviewNudge(RecruiterReviewResult{
		Score:         50,
		FitAssessment: "partial fit",
		Fixes: []RecruiterFix{
			{SectionType: "SUMMARY", Issue: "too generic", Suggestion: "add role keywords"},
		},
		Gaps: []string{"Kubernetes depth"},
	})
	if !strings.Contains(msg, "score 50") {
		t.Fatalf("expected score in nudge, got %q", msg)
	}
	if !strings.Contains(msg, "SUMMARY") {
		t.Fatalf("expected fix section in nudge, got %q", msg)
	}
}

func TestExtractRoleTitle(t *testing.T) {
	got := extractRoleTitle("create a cv for a forward deployed engineer role")
	if !strings.Contains(strings.ToLower(got), "forward deployed engineer") {
		t.Fatalf("unexpected role title %q", got)
	}
}

func TestResearchSummaryFromExecutions(t *testing.T) {
	execs := []mcp.Execution{
		{
			Tool: "web_search",
			Result: map[string]any{
				"query": "forward deployed engineer requirements",
				"results": []map[string]string{
					{"title": "FDE at Acme", "snippet": "customer-facing engineering"},
				},
			},
		},
	}
	summary := researchSummaryFromExecutions(execs)
	if !strings.Contains(summary, "forward deployed engineer") {
		t.Fatalf("expected query in summary, got %q", summary)
	}
	if !strings.Contains(summary, "customer-facing") {
		t.Fatalf("expected snippet in summary, got %q", summary)
	}
}

func TestRecruiterReviewSkipsWithoutAPIKey(t *testing.T) {
	s := &Service{hasAPIKey: false}
	result, err := s.recruiterReview(t.Context(), "FDE", "requirements", `{"sections":[]}`)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Passed {
		t.Fatal("expected pass when API key missing")
	}
}
