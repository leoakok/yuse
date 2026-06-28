package mcp

import (
	"os"
	"strings"
	"testing"
)

func TestGitHubProfileFetchLive(t *testing.T) {
	if os.Getenv("CRAWL_LIVE") != "1" {
		t.Skip("set CRAWL_LIVE=1 to run")
	}
	w := NewWebClientFromEnv()
	g := NewGitHubClientFromEnv()

	t.Run("fetch profile html", func(t *testing.T) {
		result, err := w.Fetch("https://github.com/leoakok")
		if err != nil {
			t.Fatal(err)
		}
		text, _ := result["text"].(string)
		t.Logf("profile text len=%d", len(text))
		if links, ok := result["internalLinks"].([]string); ok {
			t.Logf("internalLinks (%d): first few %v", len(links), links[:min(3, len(links))])
		}
	})

	t.Run("crawl_github_profile api", func(t *testing.T) {
		result, err := g.CrawlProfile("https://github.com/leoakok", 3, noopToolProgress{}, w)
		if err != nil {
			t.Fatal(err)
		}
		t.Logf("username=%v repos=%v details=%v",
			result["username"], len(result["repos"].([]map[string]any)), len(result["repoDetails"].([]map[string]any)))
	})
}

func TestGitHubSearchStyletteLive(t *testing.T) {
	if os.Getenv("CRAWL_LIVE") != "1" {
		t.Skip("set CRAWL_LIVE=1 to run")
	}
	token := strings.TrimSpace(os.Getenv("GITHUB_TOKEN"))
	if token == "" {
		t.Skip("set GITHUB_TOKEN for authenticated live search")
	}
	client := NewGitHubClientWithToken(token)
	result, err := client.Search("stylette", true, 10)
	if err != nil {
		t.Fatal(err)
	}
	if result["matchedCount"] != 1 {
		t.Fatalf("expected stylette match, got matchedCount=%v totalRepos=%v suggestion=%v",
			result["matchedCount"], result["totalRepos"], result["suggestion"])
	}
	repos, _ := result["repositories"].([]map[string]any)
	if len(repos) != 1 || repos[0]["name"] != "stylette" {
		t.Fatalf("expected stylette repo, got %v", repos)
	}
	t.Logf("authenticatedAs=%v totalRepos=%v", result["authenticatedAs"], result["totalRepos"])
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
