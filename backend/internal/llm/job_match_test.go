package llm

import (
	"strings"
	"testing"
)

func TestBuildMatchSystemPromptIncludesTaste(t *testing.T) {
	prompt := buildMatchSystemPrompt(MatchContext{
		BannedCompanies:  []string{"Spam Co"},
		LikedSummary:     "Prefers backend Go roles.",
		DislikedSummary:  "Avoids agencies.",
		LikedExamples:    []JobMatchInput{{JobID: "1", Title: "Go Engineer", Company: "Acme"}},
		DislikedExamples: []JobMatchInput{{JobID: "2", Title: "Recruiter", Company: "Agency"}},
	})
	for _, want := range []string{
		"Spam Co",
		"Prefers backend Go roles",
		"Avoids agencies",
		"Jobs the user liked",
		"Jobs the user disliked",
	} {
		if !strings.Contains(prompt, want) {
			t.Fatalf("prompt missing %q:\n%s", want, prompt)
		}
	}
}

func TestBuildMatchSystemPromptMinimal(t *testing.T) {
	prompt := buildMatchSystemPrompt(MatchContext{})
	if !strings.Contains(prompt, "Return strict JSON only") {
		t.Fatalf("expected base prompt, got %s", prompt)
	}
	if strings.Contains(prompt, "banned companies") {
		t.Fatal("unexpected ban section in empty context")
	}
}
