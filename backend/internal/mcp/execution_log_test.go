package mcp

import (
	"testing"
)

func TestSanitizeToolArgsRedactsSensitiveKeys(t *testing.T) {
	args := map[string]any{
		"query":        "react",
		"access_token": "secret-token",
		"password":     "hunter2",
	}
	sanitized := SanitizeToolArgs(args)
	if sanitized["query"] != "react" {
		t.Fatalf("expected query preserved, got %v", sanitized["query"])
	}
	if sanitized["access_token"] != "[redacted]" {
		t.Fatalf("expected redacted token, got %v", sanitized["access_token"])
	}
	if sanitized["password"] != "[redacted]" {
		t.Fatalf("expected redacted password, got %v", sanitized["password"])
	}
}

func TestSummarizeSearchGitHubResult(t *testing.T) {
	result := map[string]any{
		"authenticatedAs": "@leoakok",
		"query":           "",
		"repositories": []map[string]any{
			{"name": "app"},
			{"name": "lib"},
		},
	}
	summary := SummarizeToolResult("search_github", result, "")
	if summary != "Listed 2 repos for @leoakok" {
		t.Fatalf("unexpected summary: %q", summary)
	}
}

func TestBuildActionLogPayloadIncludesDurationAndSummary(t *testing.T) {
	exec := Execution{
		Tool:       "search_github",
		Arguments:  map[string]any{"listUserRepos": true},
		DurationMs: 42,
		Result: map[string]any{
			"authenticatedAs": "@leoakok",
			"repositories":    []map[string]any{{"name": "app"}},
		},
	}
	payload := BuildActionLogPayload(exec)
	if payload["durationMs"] != int64(42) {
		t.Fatalf("expected durationMs, got %v", payload["durationMs"])
	}
	if payload["authenticatedAs"] != "@leoakok" {
		t.Fatalf("expected authenticatedAs, got %v", payload["authenticatedAs"])
	}
	if payload["resultSummary"] != "Listed 1 repos for @leoakok" {
		t.Fatalf("expected resultSummary, got %v", payload["resultSummary"])
	}
}
