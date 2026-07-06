package linkedin

import (
	"strings"
	"testing"
)

func TestExtractJobPostingIDFromNestedURN(t *testing.T) {
	urn := "urn:li:fsd_jobPostingCard:(urn:li:jobPosting:4437450669,JOB_DETAILS)"
	got := extractJobPostingID(urn, "")
	if got != "4437450669" {
		t.Fatalf("got %q", got)
	}
}

func TestExtractJobPostingIDRejectsJobDetailsFragment(t *testing.T) {
	got := extractJobPostingID("urn:li:fsd_jobPostingCard:(JOB_DETAILS)", "")
	if got != "" {
		t.Fatalf("expected empty, got %q", got)
	}
}

func TestDedupeJobCards(t *testing.T) {
	in := []JobCard{
		{JobID: "4437450669", Title: "A"},
		{JobID: "4437450669", Title: "A duplicate"},
		{JobID: "JOB_DETAILS)", Title: "Bad"},
		{JobID: "4433982364", Title: "B"},
	}
	got := dedupeJobCards(in)
	if len(got) != 2 {
		t.Fatalf("expected 2 cards, got %d", len(got))
	}
}

func TestParseJobPostingCardFromIncluded(t *testing.T) {
	body := []byte(`{
		"included": [
			{
				"$type": "com.linkedin.voyager.dash.jobs.JobPostingCard",
				"entityUrn": "urn:li:fsd_jobPostingCard:(4437450669,JOBS_SEARCH)",
				"jobPostingUrn": "urn:li:fsd_jobPosting:4437450669",
				"jobPostingTitle": "Engineer A",
				"primaryDescription": {"text": "Acme Corp"},
				"secondaryDescription": {"text": "Istanbul, Türkiye (Remote)"},
				"footerItems": [{"type": "LISTED_DATE", "timeAt": 1783339973000}]
			},
			{
				"$type": "com.linkedin.voyager.dash.jobs.JobPostingCard",
				"entityUrn": "urn:li:fsd_jobPostingCard:(4437450669,JOB_DETAILS)"
			}
		]
	}`)
	got, err := parseJobCards(body)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 job, got %d", len(got))
	}
	if got[0].Company != "Acme Corp" || got[0].Location != "Istanbul, Türkiye" || got[0].WorkplaceType != "Remote" {
		t.Fatalf("unexpected card %#v", got[0])
	}
}

func TestBuildJobSearchQueryFilters(t *testing.T) {
	got := buildJobSearchQuery(SearchParams{
		Keywords:         "engineer",
		TimeFilter:       "r86400",
		WorkplaceTypes:   []string{"REMOTE"},
		ExperienceLevels: []string{"INTERNSHIP"},
		EmploymentTypes:  []string{"FULL_TIME"},
	})
	if !strings.Contains(got, "workplaceType:List(2)") || !strings.Contains(got, "experience:List(1)") || !strings.Contains(got, "jobType:List(F)") {
		t.Fatalf("query missing filters: %s", got)
	}
}

func TestBuildJobSearchQueryGeoOnly(t *testing.T) {
	got := buildJobSearchQuery(SearchParams{
		GeoID:      "103644278",
		TimeFilter: "r86400",
	})
	if strings.Contains(got, "keywords:") {
		t.Fatalf("geo-only query should omit keywords: %s", got)
	}
	if !strings.Contains(got, "locationUnion:(geoId:103644278)") {
		t.Fatalf("missing geo filter: %s", got)
	}
}

func TestBuildJobSearchQueryMultiWorkplace(t *testing.T) {
	got := buildJobSearchQuery(SearchParams{
		Keywords:       "engineer",
		TimeFilter:     "r86400",
		WorkplaceTypes: []string{"REMOTE", "HYBRID"},
	})
	if !strings.Contains(got, "workplaceType:List(2,3)") {
		t.Fatalf("expected multi workplace list: %s", got)
	}
}

func TestParseWorkplaceAndLocation(t *testing.T) {
	loc, workplace := parseWorkplaceAndLocation("Kartal, Istanbul, Türkiye (Hybrid)")
	if loc != "Kartal, Istanbul, Türkiye" || workplace != "Hybrid" {
		t.Fatalf("got %q %q", loc, workplace)
	}
}
