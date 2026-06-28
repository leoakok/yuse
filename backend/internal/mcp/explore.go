package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
)

const (
	defaultExploreMaxPages = 10
	maxExploreMaxPages     = 12
	defaultExploreMaxItems = 8
	maxExploreMaxItems     = 15
)

// WebsiteExplorer routes any public URL to the best extraction strategy.
type WebsiteExplorer struct {
	Web    *WebClient
	GitHub *GitHubClient
}

func (x *WebsiteExplorer) Explore(rawURL string, maxPages int, maxItems int, progress ToolProgress) (map[string]any, error) {
	if progress == nil {
		progress = noopToolProgress{}
	}
	rawURL = normalizeFetchURL(rawURL)
	if rawURL == "" {
		return nil, fmt.Errorf("url is required")
	}
	if err := validateFetchURL(rawURL); err != nil {
		return nil, err
	}
	if maxPages <= 0 {
		maxPages = defaultExploreMaxPages
	}
	if maxPages > maxExploreMaxPages {
		maxPages = maxExploreMaxPages
	}
	if maxItems <= 0 {
		maxItems = defaultExploreMaxItems
	}
	if maxItems > maxExploreMaxItems {
		maxItems = maxExploreMaxItems
	}

	if isGitHubProfileURL(rawURL) {
		return x.exploreGitHub(rawURL, maxItems, progress)
	}
	if isGitHubRepoURL(rawURL) {
		return x.exploreGitHubRepo(rawURL, progress)
	}
	if isGitLabProfileURL(rawURL) {
		return x.exploreGitLab(rawURL, maxItems, progress)
	}
	return x.exploreGenericSite(rawURL, maxPages, maxItems, progress)
}

func (x *WebsiteExplorer) exploreGitHub(rawURL string, maxItems int, progress ToolProgress) (map[string]any, error) {
	maxRepos := maxItems
	if maxRepos > maxGitHubMaxRepos {
		maxRepos = maxGitHubMaxRepos
	}
	ghResult, err := x.GitHub.CrawlProfile(rawURL, maxRepos, progress, x.Web)
	if err != nil {
		return nil, err
	}
	importRepos, _ := ghResult["importRepos"].([]map[string]any)
	if importRepos == nil {
		if anyRepos, ok := ghResult["importRepos"].([]any); ok {
			importRepos = make([]map[string]any, 0, len(anyRepos))
			for _, r := range anyRepos {
				if m, ok := r.(map[string]any); ok {
					importRepos = append(importRepos, m)
				}
			}
		}
	}
	importItems := normalizeGitHubImportItems(importRepos)
	ghResult["siteKind"] = "github_profile"
	ghResult["strategy"] = ghResult["source"]
	ghResult["importItems"] = importItems
	ghResult["itemsForImport"] = len(importItems)
	if _, partial := ghResult["rateLimitPartial"].(bool); !partial {
		ghResult["importNote"] = buildImportNote(len(importItems), "GitHub profile")
	}
	return ghResult, nil
}

func (x *WebsiteExplorer) exploreGitHubRepo(rawURL string, progress ToolProgress) (map[string]any, error) {
	owner, repo, ok := githubRepoFromURL(rawURL)
	if !ok {
		return nil, fmt.Errorf("not a valid github repo url")
	}
	progress.StepStart("fetch_url", map[string]any{"url": rawURL})
	detail, err := x.GitHub.FetchRepo(owner, repo)
	exec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": rawURL}}
	if err != nil {
		exec.Error = err.Error()
		progress.StepEnd(exec)
		return nil, err
	}
	exec.Result = detail
	progress.StepEnd(exec)

	result := map[string]any{
		"url":      rawURL,
		"siteKind": "github_repo",
		"strategy": "github_api",
		"repo":     detail,
	}

	if x.GitHub.HasToken() {
		login, authErr := x.GitHub.authenticatedLogin()
		if authErr == nil && login != "" {
			orgs, _ := x.GitHub.FetchOrgs(login)
			allowed := buildAllowedRepoOwners(login, orgs)
			result["authenticatedAs"] = authenticatedAsField(login)
			if ownerLogin := strings.ToLower(owner); ownerLogin != "" && !allowed[ownerLogin] {
				result["importItems"] = []map[string]any{}
				result["itemsForImport"] = 0
				result["importNote"] = fmt.Sprintf(
					"Repo owner @%s is not the connected account %s — do not import. Use search_github with listUserRepos true for the user's own repos.",
					owner, authenticatedAsField(login),
				)
				result["ownerMismatch"] = true
				return result, nil
			}
		}
	}

	entry := buildImportRepoEntry(detail)
	importItems := normalizeGitHubImportItems([]map[string]any{entry})
	result["importItems"] = importItems
	result["itemsForImport"] = len(importItems)
	result["importNote"] = buildImportNote(len(importItems), "GitHub repo")
	return result, nil
}

func (x *WebsiteExplorer) exploreGenericSite(rawURL string, maxPages int, maxItems int, progress ToolProgress) (map[string]any, error) {
	progress.StepStart("explore_website", map[string]any{"url": rawURL, "phase": "homepage"})
	crawl, err := x.Web.ExploreSite(rawURL, maxPages, progress)
	homeExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": rawURL}}
	if err != nil {
		homeExec.Error = err.Error()
		progress.StepEnd(homeExec)
		return nil, err
	}
	homeExec.Result = map[string]any{"pagesFetched": crawl["pagesFetched"]}
	progress.StepEnd(homeExec)

	pages, _ := crawl["pages"].([]map[string]any)
	importItems := importItemsFromPages(pages)
	if len(importItems) > maxItems {
		importItems = importItems[:maxItems]
	}

	profile, _ := crawl["profile"].(map[string]any)
	siteKind := "portfolio"
	if len(importItems) == 0 && len(pages) <= 1 {
		siteKind = "single_page"
	}

	result := map[string]any{
		"url":            rawURL,
		"siteKind":       siteKind,
		"strategy":       crawl["strategy"],
		"baseUrl":        crawl["baseUrl"],
		"pagesFetched":   crawl["pagesFetched"],
		"pages":          pages,
		"discoveredLinks": crawl["discoveredLinks"],
		"profile":        profile,
		"importItems":    importItems,
		"itemsForImport": len(importItems),
		"importNote":     buildImportNote(len(importItems), "website"),
	}
	if len(importItems) == 0 {
		result["importNote"] = "No structured projects were auto-detected. Read pages text and extract projects, experience, and skills manually — then batch create_twin_entry and add_section_item for everything you find (not just one item)."
	}
	return result, nil
}

func isGitLabProfileURL(rawURL string) bool {
	u, err := parseURL(rawURL)
	if err != nil {
		return false
	}
	if !strings.EqualFold(u.Hostname(), "gitlab.com") {
		return false
	}
	path := strings.Trim(u.Path, "/")
	if path == "" {
		return false
	}
	parts := strings.Split(path, "/")
	if len(parts) != 1 {
		return false
	}
	return !strings.Contains(parts[0], ".")
}

func (x *WebsiteExplorer) exploreGitLab(rawURL string, maxItems int, progress ToolProgress) (map[string]any, error) {
	username := gitLabUsernameFromURL(rawURL)
	if username == "" {
		return nil, fmt.Errorf("not a valid gitlab profile url")
	}
	apiURL := fmt.Sprintf("https://gitlab.com/api/v4/users?username=%s", urlPathEscape(username))
	progress.StepStart("fetch_url", map[string]any{"url": apiURL})
	profilePage, err := x.Web.fetchPage(apiURL, maxTextChars)
	profileExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": apiURL}}
	if err != nil {
		profileExec.Error = err.Error()
		progress.StepEnd(profileExec)
		return nil, err
	}
	profileExec.Result = map[string]any{"status": profilePage.status}
	progress.StepEnd(profileExec)

	var users []map[string]any
	if err := jsonUnmarshalSafe(profilePage.text, &users); err != nil || len(users) == 0 {
		return nil, fmt.Errorf("gitlab user not found")
	}
	user := users[0]
	userID, _ := user["id"].(float64)

	projectsAPI := fmt.Sprintf("https://gitlab.com/api/v4/users/%d/projects?per_page=%d&order_by=last_activity_at", int(userID), maxItems)
	progress.StepStart("fetch_url", map[string]any{"url": projectsAPI})
	projectsPage, err := x.Web.fetchPage(projectsAPI, maxTextChars*4)
	projectsExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": projectsAPI}}
	if err != nil {
		projectsExec.Error = err.Error()
		progress.StepEnd(projectsExec)
		return nil, err
	}
	projectsExec.Result = map[string]any{"status": projectsPage.status}
	progress.StepEnd(projectsExec)

	var projects []map[string]any
	_ = jsonUnmarshalSafe(projectsPage.text, &projects)

	importItems := make([]map[string]any, 0, len(projects))
	for _, p := range projects {
		name, _ := p["name"].(string)
		if name == "" {
			continue
		}
		desc, _ := p["description"].(string)
		webURL, _ := p["web_url"].(string)
		item := map[string]any{
			"twinType":          "PROJECT",
			"title":             name,
			"description":       strings.TrimSpace(desc),
			"url":               webURL,
			"suggestedSections": []string{"PROJECTS"},
			"source":            "gitlab",
		}
		if desc != "" {
			item["suggestedProblem"] = desc
		}
		if stars, ok := p["star_count"].(float64); ok && stars > 0 {
			item["suggestedResult"] = fmt.Sprintf("%.0f GitLab stars", stars)
		}
		importItems = append(importItems, item)

		if webURL != "" {
			progress.StepStart("fetch_url", map[string]any{"url": webURL})
			repoExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": webURL}}
			repoExec.Result = map[string]any{"title": name}
			progress.StepEnd(repoExec)
		}
	}

	profile := map[string]any{
		"username": user["username"],
		"name":     user["name"],
		"bio":      user["bio"],
		"url":      user["web_url"],
	}
	return map[string]any{
		"url":            rawURL,
		"siteKind":       "gitlab_profile",
		"strategy":       "gitlab_api",
		"profile":        profile,
		"importItems":    importItems,
		"itemsForImport": len(importItems),
		"importNote":     buildImportNote(len(importItems), "GitLab profile"),
	}, nil
}

func gitLabUsernameFromURL(rawURL string) string {
	u, err := parseURL(rawURL)
	if err != nil {
		return ""
	}
	if !strings.EqualFold(u.Hostname(), "gitlab.com") {
		return ""
	}
	path := strings.Trim(u.Path, "/")
	parts := strings.Split(path, "/")
	if len(parts) != 1 || parts[0] == "" {
		return ""
	}
	return parts[0]
}

func jsonUnmarshalSafe(text string, dest any) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return fmt.Errorf("empty json")
	}
	return json.Unmarshal([]byte(text), dest)
}
