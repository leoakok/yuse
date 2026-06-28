package mcp

import (
	"strings"
	"testing"
)

func TestLinkedInJobID(t *testing.T) {
	got := linkedInJobID("https://www.linkedin.com/jobs/view/4426941735")
	if got != "4426941735" {
		t.Fatalf("expected job id, got %q", got)
	}
	got = linkedInJobID("https://tr.linkedin.com/jobs/view/net-developer-at-innovance-consultancy-4426941735")
	if got != "4426941735" {
		t.Fatalf("expected job id from slug url, got %q", got)
	}
}

func TestLinkedInJobSlug(t *testing.T) {
	got := linkedInJobSlug("https://tr.linkedin.com/jobs/view/net-developer-at-innovance-consultancy-4426941735")
	if got != "net-developer-at-innovance-consultancy" {
		t.Fatalf("unexpected slug %q", got)
	}
}

func TestLinkedInJobSearchQuery(t *testing.T) {
	query := linkedInJobSearchQuery(
		"https://www.linkedin.com/jobs/view/net-developer-at-innovance-consultancy-4426941735",
		map[string]any{"text": "short"},
	)
	lower := strings.ToLower(query)
	for _, want := range []string{"net", "developer", "innovance"} {
		if !strings.Contains(lower, want) {
			t.Fatalf("query %q missing %q", query, want)
		}
	}
}

func TestNeedsLinkedInJobFallback(t *testing.T) {
	if !needsLinkedInJobFallback("https://www.linkedin.com/jobs/view/123", map[string]any{"text": "tiny"}) {
		t.Fatal("expected fallback for sparse linkedin text")
	}
	if needsLinkedInJobFallback("https://example.com/jobs/123", map[string]any{"text": "tiny"}) {
		t.Fatal("expected no fallback for non-linkedin url")
	}
	long := strings.Repeat("a", minLinkedInJobTextChars)
	if needsLinkedInJobFallback("https://www.linkedin.com/jobs/view/123", map[string]any{"text": long}) {
		t.Fatal("expected no fallback when text is long enough")
	}
}
