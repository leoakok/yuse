package automation

import (
	"testing"

	"github.com/leo/ai-weekend/backend/internal/linkedin"
)

func TestFilterJobsByID(t *testing.T) {
	jobs := []linkedin.JobCard{
		{JobID: "1", Title: "A"},
		{JobID: "2", Title: "B"},
		{JobID: "3", Title: "C"},
	}
	got := filterJobsByID(jobs, []string{"2", "3"})
	if len(got) != 2 || got[0].JobID != "2" || got[1].JobID != "3" {
		t.Fatalf("unexpected filter result: %+v", got)
	}
}

func TestJobCardsToMatchInputs(t *testing.T) {
	jobs := []linkedin.JobCard{
		{JobID: "99", Title: "Engineer", Company: "Acme", URL: "https://example.com"},
	}
	reasons := map[string]string{"99": "Strong fit"}
	got := jobCardsToMatchInputs(jobs, reasons)
	if len(got) != 1 || got[0].MatchReason != "Strong fit" || got[0].JobID != "99" {
		t.Fatalf("unexpected match input: %+v", got)
	}
}
