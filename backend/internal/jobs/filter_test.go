package jobs_test

import (
	"testing"

	"github.com/leo/ai-weekend/backend/internal/jobs"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestNormalizeCompanyKey(t *testing.T) {
	cases := map[string]string{
		"Acme, Inc.":     "acme",
		"Beta Labs LLC":  "beta labs",
		"  Gamma  GmbH ": "gamma",
	}
	for input, want := range cases {
		if got := jobs.NormalizeCompanyKey(input); got != want {
			t.Fatalf("NormalizeCompanyKey(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestFilterBannedJobCards(t *testing.T) {
	bans := []*store.AutomationCompanyBanRecord{{CompanyKey: "acme"}}
	cards := []linkedin.JobCard{
		{JobID: "1", Company: "Acme Corporation"},
		{JobID: "2", Company: "Beta Labs"},
	}
	filtered := jobs.FilterBannedJobCards(cards, bans)
	if len(filtered) != 1 || filtered[0].JobID != "2" {
		t.Fatalf("unexpected filtered cards: %+v", filtered)
	}
}
