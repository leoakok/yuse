package mcp

import (
	"os"
	"testing"
)

func TestCrawlSiteLiveLeoSite(t *testing.T) {
	if os.Getenv("CRAWL_LIVE") != "1" {
		t.Skip("set CRAWL_LIVE=1 to run")
	}
	w := NewWebClientFromEnv()
	result, err := w.CrawlSite("https://leo.ahmetkok.dev", 8)
	if err != nil {
		t.Fatal(err)
	}
	pages, _ := result["pages"].([]map[string]any)
	if len(pages) < 2 {
		t.Fatalf("expected multiple pages, got %d", len(pages))
	}
	for _, p := range pages {
		t.Logf("fetched %s (%d chars)", p["url"], len(p["text"].(string)))
	}
	t.Logf("discovered: %v", result["discoveredLinks"])
}
