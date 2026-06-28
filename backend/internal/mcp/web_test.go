package mcp

import (
	"net/url"
	"strings"
	"testing"
)

func TestValidateFetchURLBlocksLocalhost(t *testing.T) {
	cases := []string{
		"http://localhost/admin",
		"http://127.0.0.1:8080/healthz",
		"https://0.0.0.0/",
	}
	for _, raw := range cases {
		if err := validateFetchURL(raw); err == nil {
			t.Fatalf("expected blocked url %q", raw)
		}
	}
}

func TestValidateFetchURLAllowsPublicHTTPS(t *testing.T) {
	if err := validateFetchURL("https://example.com"); err != nil {
		t.Fatalf("expected public url allowed, got %v", err)
	}
}

func TestNormalizeFetchURLAddsHTTPS(t *testing.T) {
	got := normalizeFetchURL("leo.useefficiently.com")
	if got != "https://leo.useefficiently.com" {
		t.Fatalf("expected https prefix, got %q", got)
	}
	if err := validateFetchURL(got); err != nil {
		t.Fatalf("expected normalized url allowed, got %v", err)
	}
}

func TestValidateFetchURLRejectsNonHTTP(t *testing.T) {
	if err := validateFetchURL("file:///etc/passwd"); err == nil {
		t.Fatal("expected file scheme blocked")
	}
}

func TestExtractReadableTextStripsHTML(t *testing.T) {
	html := `<html><head><style>body{}</style></head><body><h1>Hello</h1><p>World</p></body></html>`
	text := extractReadableText(html, "text/html")
	if !strings.Contains(text, "Hello") || !strings.Contains(text, "World") {
		t.Fatalf("unexpected text: %q", text)
	}
	if strings.Contains(text, "<h1>") {
		t.Fatalf("expected tags stripped, got %q", text)
	}
}

func TestToolActivityStartLabelWebSearch(t *testing.T) {
	label := ToolActivityStartLabel("web_search", map[string]any{"query": "Acme Corp careers"})
	if !strings.Contains(label, "Acme Corp") {
		t.Fatalf("expected query in label, got %q", label)
	}
}

func TestParseDuckDuckGoResultsRealisticHTML(t *testing.T) {
	html := `<a rel="nofollow" class="result__a" href="https://en.wikipedia.org/wiki/Elon_Musk">Elon Musk - Wikipedia</a>
<a class="result__snippet" href="https://en.wikipedia.org/wiki/Elon_Musk"><b>Elon</b> Reeve <b>Musk</b> is a businessman and CEO of Tesla and SpaceX.</a>
<a rel="nofollow" class="result__a" href="https://www.forbes.com/profile/elon-musk/">Elon Musk - Forbes</a>
<a class="result__snippet" href="https://www.forbes.com/profile/elon-musk/"><b>Elon</b> <b>Musk</b> is #1 on Forbes&#x27; Billionaires list.</a>`

	results := parseDuckDuckGoResults(html, 5)
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d: %+v", len(results), results)
	}
	if results[0]["title"] != "Elon Musk - Wikipedia" {
		t.Fatalf("unexpected title: %q", results[0]["title"])
	}
	if !strings.Contains(results[0]["snippet"], "Tesla and SpaceX") {
		t.Fatalf("expected stripped snippet text, got %q", results[0]["snippet"])
	}
	if results[0]["url"] != "https://en.wikipedia.org/wiki/Elon_Musk" {
		t.Fatalf("unexpected url: %q", results[0]["url"])
	}
}

func TestParseDuckDuckGoResultsEmpty(t *testing.T) {
	if got := parseDuckDuckGoResults("<html><body>no results</body></html>", 5); len(got) != 0 {
		t.Fatalf("expected no results, got %+v", got)
	}
}

func TestExtractInternalLinksSameOrigin(t *testing.T) {
	html := `<html><body>
		<a href="/about">About</a>
		<a href="https://leo.ahmetkok.dev/projects">Projects</a>
		<a href="https://other.example.com/page">External</a>
		<a href="mailto:hi@leo.ahmetkok.dev">Email</a>
		<a href="/static/logo.png">Logo</a>
		<a href="#section">Anchor</a>
	</body></html>`
	base := "https://leo.ahmetkok.dev/"
	links := extractInternalLinks(html, base)
	if len(links) != 2 {
		t.Fatalf("expected 2 same-origin page links, got %d: %v", len(links), links)
	}
	want := map[string]bool{
		"https://leo.ahmetkok.dev/about":     true,
		"https://leo.ahmetkok.dev/projects": true,
	}
	for _, link := range links {
		if !want[link] {
			t.Fatalf("unexpected link %q", link)
		}
	}
}

func TestExtractInternalLinksDedupesAndCaps(t *testing.T) {
	var parts []string
	for i := 0; i < 30; i++ {
		parts = append(parts, `<a href="/page`+string(rune('a'+i%26))+`">P</a>`)
	}
	parts = append(parts, `<a href="/about">About</a>`, `<a href="/about">About dup</a>`)
	html := "<html><body>" + strings.Join(parts, "") + "</body></html>"
	links := extractInternalLinks(html, "https://example.com/")
	if len(links) > maxInternalLinks {
		t.Fatalf("expected at most %d links, got %d", maxInternalLinks, len(links))
	}
	seen := make(map[string]bool)
	for _, link := range links {
		if seen[link] {
			t.Fatalf("duplicate link %q", link)
		}
		seen[link] = true
		if !strings.HasPrefix(link, "https://example.com/") {
			t.Fatalf("expected same origin, got %q", link)
		}
	}
}

func TestPrioritizeInternalLinks(t *testing.T) {
	links := []string{
		"https://leo.ahmetkok.dev/contact",
		"https://leo.ahmetkok.dev/about",
		"https://leo.ahmetkok.dev/projects",
		"https://leo.ahmetkok.dev/",
	}
	got := prioritizeInternalLinks(links, "https://leo.ahmetkok.dev/")
	if len(got) != 3 {
		t.Fatalf("expected homepage removed, got %d: %v", len(got), got)
	}
	if got[0] != "https://leo.ahmetkok.dev/about" && got[0] != "https://leo.ahmetkok.dev/projects" {
		t.Fatalf("expected about/projects first, got %v", got)
	}
	if linkPriorityScore("https://x.dev/about") <= linkPriorityScore("https://x.dev/contact") {
		t.Fatal("expected about to score higher than contact")
	}
}

func TestIsSameOrigin(t *testing.T) {
	base, _ := url.Parse("https://leo.ahmetkok.dev/")
	same, _ := url.Parse("https://leo.ahmetkok.dev/about")
	diff, _ := url.Parse("http://leo.ahmetkok.dev/about")
	other, _ := url.Parse("https://other.dev/about")
	if !isSameOrigin(base, same) {
		t.Fatal("expected same origin")
	}
	if isSameOrigin(base, diff) {
		t.Fatal("expected different scheme to differ")
	}
	if isSameOrigin(base, other) {
		t.Fatal("expected different host to differ")
	}
}

func TestCanonicalPageURL(t *testing.T) {
	if got := canonicalPageURL("https://Example.com/about/"); got != "https://example.com/about" {
		t.Fatalf("unexpected canonical %q", got)
	}
	if got := canonicalPageURL("https://example.com/"); got != "https://example.com/" {
		t.Fatalf("unexpected root canonical %q", got)
	}
}
