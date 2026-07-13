package linkedin

import (
	"strings"
	"testing"
)

func TestNormalizeSortBy(t *testing.T) {
	got, err := NormalizeSortBy("DATE_DESC")
	if err != nil || got != sortByDateDesc {
		t.Fatalf("DATE_DESC: got %q err %v", got, err)
	}
	got, err = NormalizeSortBy("RELEVANCE")
	if err != nil || got != sortByRelevance {
		t.Fatalf("RELEVANCE: got %q err %v", got, err)
	}
	if _, err := NormalizeSortBy("INVALID"); err == nil {
		t.Fatal("expected error for invalid sort")
	}
}

func TestBuildJobSearchURLPagination(t *testing.T) {
	got := buildJobSearchURL(SearchParams{
		Keywords:   "engineer",
		TimeFilter: "r86400",
		SortBy:     sortByRelevance,
		Start:      50,
	})
	if !strings.Contains(got, "start=50") {
		t.Fatalf("missing start param: %s", got)
	}
	if !strings.Contains(got, "sortBy:List(R)") {
		t.Fatalf("missing relevance sort: %s", got)
	}
}

func TestNormalizeMaxResults(t *testing.T) {
	if got := normalizeMaxResults(0); got != defaultMaxResults {
		t.Fatalf("zero: got %d", got)
	}
	if got := normalizeMaxResults(500); got != maxMaxResults {
		t.Fatalf("cap: got %d want %d", got, maxMaxResults)
	}
	if got := normalizeMaxResults(75); got != 75 {
		t.Fatalf("custom: got %d", got)
	}
}
