package linkedin

import (
	"os"
	"testing"
)

func TestParseAppliedJobsFixture(t *testing.T) {
	raw, err := os.ReadFile("testdata/applied_jobs_sample.json")
	if err != nil {
		t.Fatal(err)
	}
	cards, total, err := parseAppliedJobsResponse(raw)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 {
		t.Fatalf("total=%d want 1", total)
	}
	if len(cards) != 1 {
		t.Fatalf("cards=%d want 1", len(cards))
	}
	if cards[0].JobID != "1234567890" {
		t.Fatalf("jobId=%q", cards[0].JobID)
	}
	if cards[0].Title != "Software Engineer" {
		t.Fatalf("title=%q", cards[0].Title)
	}
	if cards[0].Company != "Acme Corp" {
		t.Fatalf("company=%q", cards[0].Company)
	}
	if cards[0].LinkedInStatus != "Application viewed" {
		t.Fatalf("status=%q", cards[0].LinkedInStatus)
	}
}
