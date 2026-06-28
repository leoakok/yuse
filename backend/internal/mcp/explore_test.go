package mcp

import "testing"

func TestIsNavJunkLink(t *testing.T) {
	if !isNavJunkLink("https://github.com/login") {
		t.Fatal("expected login to be junk")
	}
	if isNavJunkLink("https://example.com/projects/acme") {
		t.Fatal("expected project page to be kept")
	}
}

func TestLinkPriorityScore(t *testing.T) {
	about := linkPriorityScore("https://example.com/about")
	project := linkPriorityScore("https://example.com/projects/foo")
	login := linkPriorityScore("https://example.com/login")
	if about <= 0 || project < about {
		t.Fatalf("expected project >= about, got about=%d project=%d", about, project)
	}
	if login >= 0 {
		t.Fatalf("expected login to score negative, got %d", login)
	}
}

func TestImportItemsFromJSONLD(t *testing.T) {
	html := `<html><head><script type="application/ld+json">{"@type":"CreativeWork","name":"Acme App","description":"Built APIs","url":"https://example.com/acme"}</script></head></html>`
	nodes := extractJSONLDBlocks(html)
	items := importItemsFromJSONLD(nodes)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0]["title"] != "Acme App" {
		t.Fatalf("unexpected title: %v", items[0]["title"])
	}
}

func TestNormalizeGitHubImportItems(t *testing.T) {
	items := normalizeGitHubImportItems([]map[string]any{
		{"title": "foo", "description": "bar", "url": "https://github.com/u/foo", "language": "Go", "suggestedResult": "5 stars"},
	})
	if len(items) != 1 {
		t.Fatal("expected one item")
	}
	if items[0]["twinType"] != "PROJECT" {
		t.Fatalf("unexpected twinType: %v", items[0]["twinType"])
	}
}

func TestBuildImportNote(t *testing.T) {
	note := buildImportNote(5, "website")
	if note == "" || len(note) < 20 {
		t.Fatal("expected non-empty import note")
	}
}
