package mcp

import (
	"errors"
	"net/http"
	"strings"
	"testing"
)

func TestGitHubUsernameFromURL(t *testing.T) {
	cases := map[string]string{
		"https://github.com/leoakok":     "leoakok",
		"github.com/leoakok":             "leoakok",
		"https://github.com/leoakok/":    "leoakok",
		"https://github.com/login":       "",
		"https://github.com/features":    "",
		"https://example.com/leoakok":    "",
	}
	for raw, want := range cases {
		if got := githubUsernameFromURL(raw); got != want {
			t.Fatalf("githubUsernameFromURL(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestGitHubRepoFromURL(t *testing.T) {
	owner, repo, ok := githubRepoFromURL("https://github.com/leoakok/useefficiently")
	if !ok || owner != "leoakok" || repo != "useefficiently" {
		t.Fatalf("unexpected repo parse: %s/%s ok=%v", owner, repo, ok)
	}
	_, _, ok = githubRepoFromURL("https://github.com/leoakok")
	if ok {
		t.Fatal("expected profile url to not parse as repo")
	}
}

func TestIsGitHubProfileURL(t *testing.T) {
	if !isGitHubProfileURL("https://github.com/leoakok") {
		t.Fatal("expected profile url")
	}
	if isGitHubProfileURL("https://github.com/login") {
		t.Fatal("expected reserved path to be rejected")
	}
}

func TestGitHubCrawlProfileUnit(t *testing.T) {
	g := NewGitHubClientFromEnv()
	result, err := g.CrawlProfile("https://github.com/leoakok", 2, noopToolProgress{}, nil)
	if err != nil {
		t.Skipf("github api unavailable: %v", err)
	}
	if result["username"] != "leoakok" {
		t.Fatalf("unexpected username: %v", result["username"])
	}
	repos, _ := result["repos"].([]map[string]any)
	if len(repos) == 0 {
		t.Fatal("expected repos")
	}
	details, _ := result["repoDetails"].([]map[string]any)
	if len(details) == 0 {
		t.Fatal("expected repo details")
	}
	importRepos, _ := result["importRepos"].([]map[string]any)
	if len(importRepos) == 0 {
		t.Fatal("expected importRepos")
	}
	if result["importNote"] == "" {
		t.Fatal("expected importNote")
	}
}

func TestParseGitHubReposFromHTML(t *testing.T) {
	html := `<a href="/leoakok/my-app">my-app</a><a href="/leoakok/other">other</a><a href="/leoakok/repositories">repos tab</a>`
	repos := parseGitHubReposFromHTML("leoakok", html)
	if len(repos) != 2 {
		t.Fatalf("expected 2 repos, got %d", len(repos))
	}
}

func TestGitHubRateLimitErrorFromHeaders(t *testing.T) {
	headers := http.Header{}
	headers.Set("X-RateLimit-Remaining", "0")
	headers.Set("X-RateLimit-Limit", "60")
	headers.Set("X-RateLimit-Reset", "1700000000")
	err := newGitHubRateLimitError(403, []byte(`{"message":"API rate limit exceeded"}`), headers)
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if err.Remaining != 0 || err.Limit != 60 {
		t.Fatalf("unexpected limits: remaining=%d limit=%d", err.Remaining, err.Limit)
	}
	var rl *GitHubRateLimitError
	if !errors.As(err, &rl) {
		t.Fatal("expected GitHubRateLimitError type")
	}
}

func TestBuildGitHubImportNotePartial(t *testing.T) {
	note := buildGitHubImportNote(3, true, "rate limited")
	if !strings.Contains(note, "PARTIAL") {
		t.Fatalf("expected partial note, got %q", note)
	}
	if !strings.Contains(note, "3 repos") {
		t.Fatalf("expected repo count in note, got %q", note)
	}
}
