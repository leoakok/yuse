package llm

import (
	"testing"

	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func TestShouldNudgeWebsiteImport(t *testing.T) {
	crawl := mcp.Execution{
		Tool: "explore_website",
		Result: map[string]any{
			"itemsForImport": float64(3),
			"importItems": []map[string]any{
				{"title": "a"}, {"title": "b"}, {"title": "c"},
			},
		},
	}
	oneCreate := mcp.Execution{
		Tool:      "create_twin_entry",
		Arguments: map[string]any{"type": "PROJECT"},
	}

	executions := []mcp.Execution{crawl, oneCreate}
	if !shouldNudgeWebsiteImport("https://github.com/leoakok import projects", executions, "Added one project.") {
		t.Fatal("expected nudge after single project import")
	}

	executions = []mcp.Execution{
		crawl,
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
	}
	if shouldNudgeWebsiteImport("https://github.com/leoakok", executions, "Saved 3 projects.") {
		t.Fatal("expected no nudge when all items imported")
	}
}

func TestShouldNudgeGitHubImport(t *testing.T) {
	crawl := mcp.Execution{
		Tool: "crawl_github_profile",
		Result: map[string]any{
			"reposForImport": float64(3),
			"importRepos": []map[string]any{
				{"name": "a"}, {"name": "b"}, {"name": "c"},
			},
		},
	}
	oneCreate := mcp.Execution{
		Tool:      "create_twin_entry",
		Arguments: map[string]any{"type": "PROJECT"},
	}

	executions := []mcp.Execution{crawl, oneCreate}
	if !shouldNudgeGitHubImport("import from github.com/leoakok", executions, "Added one project.") {
		t.Fatal("expected nudge after single project import")
	}

	executions = []mcp.Execution{
		crawl,
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
		{Tool: "create_twin_entry", Arguments: map[string]any{"type": "PROJECT"}},
	}
	if shouldNudgeGitHubImport("import from github.com/leoakok", executions, "Saved 3 projects.") {
		t.Fatal("expected no nudge when all repos imported")
	}
}

func TestUserAskedGitHubImport(t *testing.T) {
	if !userAskedGitHubImport("crawl github.com/leoakok and import projects") {
		t.Fatal("expected github import intent")
	}
	if userAskedGitHubImport("create a senior engineer resume") {
		t.Fatal("expected no github intent")
	}
}
