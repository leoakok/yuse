package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
)

var sensitiveArgKeys = map[string]struct{}{
	"token":         {},
	"accesstoken":   {},
	"access_token":  {},
	"password":      {},
	"secret":        {},
	"authorization": {},
	"apikey":        {},
	"api_key":       {},
}

// SanitizeToolArgs returns a copy of tool arguments with sensitive values redacted.
func SanitizeToolArgs(args map[string]any) map[string]any {
	if len(args) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(args))
	for key, value := range args {
		if isSensitiveArgKey(key) {
			out[key] = "[redacted]"
			continue
		}
		out[key] = value
	}
	return out
}

func isSensitiveArgKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	_, ok := sensitiveArgKeys[normalized]
	return ok
}

// SanitizeToolArgsJSON marshals sanitized tool args for structured logging.
func SanitizeToolArgsJSON(args map[string]any) []byte {
	raw, err := json.Marshal(SanitizeToolArgs(args))
	if err != nil {
		return []byte("{}")
	}
	return raw
}

// AuthenticatedAsFromResult extracts authenticatedAs from a tool result map.
func AuthenticatedAsFromResult(result any) string {
	m, ok := result.(map[string]any)
	if !ok {
		return ""
	}
	if v, ok := m["authenticatedAs"].(string); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

// SummarizeToolResult returns a short, client-safe summary of a tool execution.
func SummarizeToolResult(tool string, result any, err string) string {
	if err != "" {
		return err
	}
	m, _ := result.(map[string]any)
	switch tool {
	case "search_github":
		auth := AuthenticatedAsFromResult(result)
		count := repoCountFromResult(m, "repositories", "userRepositories", "importRepositories")
		query, _ := m["query"].(string)
		query = strings.TrimSpace(query)
		if auth != "" && query == "" {
			if count > 0 {
				return githubReposFoundLabel(count)
			}
			return "Got your GitHub repos"
		}
		if auth != "" {
			matched := intFromAny(m["matchedCount"])
			if matched == 0 {
				matched = count
			}
			return fmt.Sprintf("Found %d matching repos on your GitHub", matched)
		}
		return fmt.Sprintf("Found %d public repos", count)
	case "crawl_github_profile", "explore_website":
		if auth := AuthenticatedAsFromResult(result); auth != "" {
			count := repoCountFromResult(m, "importRepos", "repos")
			if count > 0 {
				return fmt.Sprintf("Got your GitHub profile with %d repos", count)
			}
			return "Got your GitHub profile"
		}
	case "web_search":
		if m != nil {
			if results, ok := m["results"].([]any); ok && len(results) > 0 {
				return "Found some useful links"
			}
		}
	case "fetch_url":
		return "Read that page"
	case "create_twin_entry":
		if m != nil {
			if title, ok := m["title"].(string); ok && title != "" {
				return fmt.Sprintf("Saved %q to your Digital Twin", truncateLabel(title, 60))
			}
		}
	case "add_section_item":
		if m != nil {
			if headline, ok := m["headline"].(string); ok && headline != "" {
				return fmt.Sprintf("Added %q to your CV", truncateLabel(headline, 60))
			}
		}
	}
	return ""
}

func repoCountFromResult(m map[string]any, keys ...string) int {
	if m == nil {
		return 0
	}
	for _, key := range keys {
		switch v := m[key].(type) {
		case []map[string]any:
			if len(v) > 0 {
				return len(v)
			}
		case []any:
			if len(v) > 0 {
				return len(v)
			}
		}
	}
	return 0
}

func githubReposFoundLabel(count int) string {
	if count == 1 {
		return "Found 1 repo on your GitHub"
	}
	return fmt.Sprintf("Found %d repos on your GitHub", count)
}

func intFromAny(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

// BuildActionLogPayload builds the persisted action log payload for a tool execution.
func BuildActionLogPayload(exec Execution) map[string]any {
	payload := SanitizeToolArgs(exec.Arguments)
	if exec.DurationMs > 0 {
		payload["durationMs"] = exec.DurationMs
	}
	if summary := SummarizeToolResult(exec.Tool, exec.Result, exec.Error); summary != "" {
		payload["resultSummary"] = summary
	}
	if auth := AuthenticatedAsFromResult(exec.Result); auth != "" {
		payload["authenticatedAs"] = auth
	}
	return payload
}
