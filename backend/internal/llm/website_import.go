package llm

import (
	"strings"

	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func userAskedWebsiteImport(text string) bool {
	lower := strings.ToLower(text)
	if strings.Contains(lower, "http://") || strings.Contains(lower, "https://") {
		return true
	}
	phrases := []string{
		"github.com/", "gitlab.com/",
		"my website", "my site", "my portfolio",
		"from github", "from gitlab", "import github", "import projects",
		"import repos", "import repositories", "github profile",
		"github repos", "github projects", "crawl github", "explore website",
		"crawl my", "check my site", "review my site", "from my profile",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

// userAskedGitHubImport kept for tests and backward compatibility.
func userAskedGitHubImport(text string) bool {
	return userAskedWebsiteImport(text)
}

func websiteExploreImportTarget(executions []mcp.Execution) int {
	for i := len(executions) - 1; i >= 0; i-- {
		exec := executions[i]
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "explore_website", "crawl_github_profile":
			if n := importTargetFromExploreResult(exec.Result); n > 0 {
				return n
			}
		}
	}
	return 0
}

func githubCrawlImportTarget(executions []mcp.Execution) int {
	return websiteExploreImportTarget(executions)
}

func importTargetFromExploreResult(result any) int {
	m, ok := result.(map[string]any)
	if !ok {
		return 0
	}
	if n, ok := m["itemsForImport"].(float64); ok && n > 0 {
		return int(n)
	}
	if n, ok := m["reposForImport"].(float64); ok && n > 0 {
		return int(n)
	}
	if items, ok := m["importItems"].([]any); ok && len(items) > 0 {
		return len(items)
	}
	if items, ok := m["importItems"].([]map[string]any); ok && len(items) > 0 {
		return len(items)
	}
	if importRepos, ok := m["importRepos"].([]map[string]any); ok && len(importRepos) > 0 {
		return len(importRepos)
	}
	if importRepos, ok := m["importRepos"].([]any); ok && len(importRepos) > 0 {
		return len(importRepos)
	}
	if n, ok := m["reposFetched"].(float64); ok && n > 0 {
		return int(n)
	}
	return 0
}

func countTwinProjectCreates(executions []mcp.Execution) int {
	count := 0
	for _, exec := range executions {
		if exec.Tool != "create_twin_entry" || exec.Error != "" {
			continue
		}
		entryType, _ := exec.Arguments["type"].(string)
		if entryType == "" || entryType == "PROJECT" {
			count++
		}
	}
	return count
}

func websiteImportBatchComplete(userText string, executions []mcp.Execution) bool {
	target := websiteExploreImportTarget(executions)
	if target == 0 {
		return true
	}
	created := countTwinProjectCreates(executions)
	minExpected := target
	if minExpected > 3 {
		minExpected = 3
	}
	if created >= target {
		return true
	}
	if created >= minExpected && !userAskedCreateCV(userText) {
		return true
	}
	return false
}

func githubImportBatchComplete(userText string, executions []mcp.Execution) bool {
	return websiteImportBatchComplete(userText, executions)
}

func shouldNudgeWebsiteImport(userText string, executions []mcp.Execution, reply string) bool {
	target := websiteExploreImportTarget(executions)
	if target == 0 {
		return false
	}
	if websiteImportBatchComplete(userText, executions) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if !userAskedWebsiteImport(userText) && target == 0 {
		return false
	}
	return countTwinProjectCreates(executions) < target
}

func shouldNudgeGitHubImport(userText string, executions []mcp.Execution, reply string) bool {
	return shouldNudgeWebsiteImport(userText, executions, reply)
}

const websiteImportNudge = "Website exploration returned multiple items in importItems. Batch-create create_twin_entry (type PROJECT or matching twinType) for EVERY item in importItems this turn — do not stop after one. Use suggestedProblem/suggestedAction/suggestedResult for PAR fields. Skip STAR follow-ups for imports. If building a CV, add_section_item on each suggested section for every item."

const githubImportNudge = websiteImportNudge
