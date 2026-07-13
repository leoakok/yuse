package automation

import (
	"testing"

	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestNormalizeCompanyKey(t *testing.T) {
	cases := map[string]string{
		"Acme Corp.":      "acme",
		"ACME LLC":        "acme",
		"  Foo   Bar Inc": "foo bar",
		"Example A.Ş.":    "example",
	}
	for input, want := range cases {
		if got := NormalizeCompanyKey(input); got != want {
			t.Fatalf("%q: got %q want %q", input, got, want)
		}
	}
}

func TestCompanyKeysMatch(t *testing.T) {
	if !companyKeysMatch("acme corp", "acme") {
		t.Fatal("expected acme corp to match acme")
	}
	if companyKeysMatch("beta", "acme") {
		t.Fatal("expected beta not to match acme")
	}
}

func TestCompanyMatchesBan(t *testing.T) {
	bans := []*store.AutomationCompanyBanRecord{
		{CompanyKey: "acme"},
	}
	if !CompanyMatchesBan("Acme Corporation", bans) {
		t.Fatal("expected ban match")
	}
	if CompanyMatchesBan("Beta Labs", bans) {
		t.Fatal("expected no ban match")
	}
}

func TestFilterBannedJobCards(t *testing.T) {
	bans := []*store.AutomationCompanyBanRecord{
		{CompanyKey: "spam co", CompanyDisplay: "Spam Co"},
	}
	jobs := []linkedin.JobCard{
		{JobID: "1", Company: "Spam Co Ltd"},
		{JobID: "2", Company: "Good Inc"},
	}
	filtered := FilterBannedJobCards(jobs, bans)
	if len(filtered) != 1 || filtered[0].JobID != "2" {
		t.Fatalf("expected one non-banned job, got %+v", filtered)
	}
}
