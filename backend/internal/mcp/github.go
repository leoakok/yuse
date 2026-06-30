package mcp

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	defaultGitHubMaxRepos = 5
	maxGitHubMaxRepos     = 10
	githubAPITimeout      = 15 * time.Second
	minGitHubProfileText  = 200
	githubAPIHost         = "https://api.github.com"
)

// githubAPIBaseURL is the GitHub REST root; tests may override it.
var githubAPIBaseURL = githubAPIHost

func githubAPIURL(path string) string {
	path = strings.TrimSpace(path)
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return strings.TrimRight(githubAPIBaseURL, "/") + path
}

var (
	githubProfilePathPattern = regexp.MustCompile(`(?i)^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?)/?$`)
	githubRepoPathPattern    = regexp.MustCompile(`(?i)^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_.-]+)/?$`)
	githubHTMLRepoLinkPattern = regexp.MustCompile(`(?i)href="/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_.-]+)"`)
	githubReservedPaths      = map[string]bool{
		"login": true, "signup": true, "features": true, "enterprise": true,
		"marketplace": true, "pricing": true, "about": true, "security": true,
		"settings": true, "notifications": true, "explore": true, "topics": true,
		"trending": true, "collections": true, "sponsors": true, "orgs": true,
		"organizations": true, "mcp": true, "team": true, "customer-stories": true,
	}
)

// ToolProgress reports sub-steps during a multi-step tool (e.g. GitHub crawl).
type ToolProgress interface {
	StepStart(toolName string, args map[string]any)
	StepEnd(exec Execution)
}

type noopToolProgress struct{}

func (noopToolProgress) StepStart(string, map[string]any) {}
func (noopToolProgress) StepEnd(Execution)               {}

type GitHubClient struct {
	client *http.Client
	token  string
}

// GitHubRateLimitError is returned when GitHub responds with a rate-limit response.
type GitHubRateLimitError struct {
	Message   string
	Remaining int
	Limit     int
	Reset     time.Time
	Status    int
}

func (e *GitHubRateLimitError) Error() string {
	if e == nil {
		return "github api rate limit exceeded"
	}
	if e.Message != "" {
		return e.Message
	}
	return "github api rate limit exceeded — set GITHUB_TOKEN for higher limits"
}

func isGitHubRateLimitError(err error) (*GitHubRateLimitError, bool) {
	var rl *GitHubRateLimitError
	if errors.As(err, &rl) {
		return rl, true
	}
	return nil, false
}

type githubAPIResult struct {
	object map[string]any
	array  []map[string]any
}

func NewGitHubClientFromEnv() *GitHubClient {
	token := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(os.Getenv("GITHUB_TOKEN")), "Bearer "))
	return NewGitHubClientWithToken(token)
}

func NewGitHubClientWithToken(token string) *GitHubClient {
	return &GitHubClient{
		token: strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(token), "Bearer ")),
		client: &http.Client{
			Timeout: githubAPITimeout,
		},
	}
}

func (g *GitHubClient) HasToken() bool {
	return g != nil && strings.TrimSpace(g.token) != ""
}

func isGitHubHostURL(rawURL string) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(rawURL)), "github.com")
}

func isGitHubProfileURL(rawURL string) bool {
	username := githubUsernameFromURL(rawURL)
	return username != ""
}

func isGitHubRepoURL(rawURL string) bool {
	_, _, ok := githubRepoFromURL(rawURL)
	return ok
}

func githubUsernameFromURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}
	if !strings.Contains(rawURL, "://") {
		rawURL = "https://" + rawURL
	}
	match := githubProfilePathPattern.FindStringSubmatch(rawURL)
	if len(match) < 2 {
		return ""
	}
	username := strings.ToLower(match[1])
	if githubReservedPaths[username] {
		return ""
	}
	return match[1]
}

func githubRepoFromURL(rawURL string) (owner, repo string, ok bool) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", "", false
	}
	if !strings.Contains(rawURL, "://") {
		rawURL = "https://" + rawURL
	}
	match := githubRepoPathPattern.FindStringSubmatch(rawURL)
	if len(match) < 3 {
		return "", "", false
	}
	owner, repo = match[1], match[2]
	if strings.EqualFold(repo, "repositories") || strings.EqualFold(repo, "projects") ||
		strings.EqualFold(repo, "packages") || strings.EqualFold(repo, "stars") {
		return "", "", false
	}
	return owner, repo, true
}

func githubProfilePageURL(username string) string {
	return "https://github.com/" + username
}

func githubReposAPIURL(username string) string {
	return githubAPIURL(fmt.Sprintf("/users/%s/repos?per_page=30&sort=updated", urlPathEscape(username)))
}

func githubUserReposAPIURL(perPage int) string {
	return githubUserReposPageAPIURL(perPage, 1)
}

func githubUserReposPageAPIURL(perPage, page int) string {
	if perPage <= 0 {
		perPage = 30
	}
	if page <= 0 {
		page = 1
	}
	return githubAPIURL(fmt.Sprintf(
		"/user/repos?per_page=%d&page=%d&sort=updated&affiliation=owner,collaborator,organization_member",
		perPage, page,
	))
}

const (
	githubUserReposPageSize = 100
	githubUserReposMaxPages = 10 // up to 1000 repos
)

func authenticatedAsField(login string) string {
	login = strings.TrimSpace(login)
	if login == "" {
		return ""
	}
	if strings.HasPrefix(login, "@") {
		return login
	}
	return "@" + login
}

func repoOwnerLogin(repo map[string]any) string {
	if owner, ok := repo["owner"].(map[string]any); ok {
		if login, ok := owner["login"].(string); ok {
			return strings.TrimSpace(login)
		}
	}
	if full, ok := repo["full_name"].(string); ok {
		parts := strings.SplitN(full, "/", 2)
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	return ""
}

func buildAllowedRepoOwners(authLogin string, orgs []map[string]any) map[string]bool {
	allowed := map[string]bool{}
	if authLogin = strings.TrimSpace(authLogin); authLogin != "" {
		allowed[strings.ToLower(authLogin)] = true
	}
	for _, org := range orgs {
		if login, ok := org["login"].(string); ok && strings.TrimSpace(login) != "" {
			allowed[strings.ToLower(login)] = true
		}
	}
	return allowed
}

func filterReposByAllowedOwners(repos []map[string]any, allowed map[string]bool) []map[string]any {
	if len(allowed) == 0 {
		return repos
	}
	out := make([]map[string]any, 0, len(repos))
	for _, repo := range repos {
		owner := strings.ToLower(repoOwnerLogin(repo))
		if owner != "" && !allowed[owner] {
			continue
		}
		out = append(out, repo)
	}
	return out
}

func githubRepoAPIURL(owner, repo string) string {
	return githubAPIURL(fmt.Sprintf("/repos/%s/%s", urlPathEscape(owner), urlPathEscape(repo)))
}

func (g *GitHubClient) apiGet(path string) (map[string]any, error) {
	result, err := g.doAPIRequest(path)
	if err != nil {
		return nil, err
	}
	if result.object != nil {
		return result.object, nil
	}
	return map[string]any{"data": result.array}, nil
}

func (g *GitHubClient) apiGetArray(path string) ([]map[string]any, error) {
	result, err := g.doAPIRequest(path)
	if err != nil {
		return nil, err
	}
	if result.array != nil {
		return result.array, nil
	}
	if result.object != nil {
		return []map[string]any{result.object}, nil
	}
	return nil, nil
}

func (g *GitHubClient) doAPIRequest(path string) (githubAPIResult, error) {
	req, err := http.NewRequest(http.MethodGet, githubAPIURL(path), nil)
	if err != nil {
		return githubAPIResult{}, err
	}
	req.Header.Set("User-Agent", "Yuse-CV-Assistant/1.0")
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}

	resp, err := g.client.Do(req)
	if err != nil {
		return githubAPIResult{}, fmt.Errorf("github api request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFetchBytes))
	if err != nil {
		return githubAPIResult{}, err
	}

	if resp.StatusCode == 404 {
		return githubAPIResult{}, fmt.Errorf("github resource not found (HTTP 404)")
	}
	if resp.StatusCode == 403 || resp.StatusCode == 429 {
		if rlErr := newGitHubRateLimitError(resp.StatusCode, body, resp.Header); rlErr != nil {
			return githubAPIResult{}, rlErr
		}
		return githubAPIResult{}, fmt.Errorf("github api returned HTTP %d", resp.StatusCode)
	}
	if resp.StatusCode == 204 {
		return githubAPIResult{array: []map[string]any{}}, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return githubAPIResult{}, fmt.Errorf("github api returned HTTP %d", resp.StatusCode)
	}

	trimmedBody := strings.TrimSpace(string(body))
	if trimmedBody == "" {
		// GitHub occasionally returns an empty 200 on trailing pagination pages.
		return githubAPIResult{array: []map[string]any{}}, nil
	}

	var parsed any
	if err := json.Unmarshal([]byte(trimmedBody), &parsed); err != nil {
		return githubAPIResult{}, fmt.Errorf(
			"parse github api response (HTTP %d, %d bytes): %w; body=%q",
			resp.StatusCode,
			len(body),
			err,
			githubAPIBodyPreview(trimmedBody),
		)
	}
	switch v := parsed.(type) {
	case map[string]any:
		return githubAPIResult{object: v}, nil
	case []any:
		out := make([]map[string]any, 0, len(v))
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return githubAPIResult{array: out}, nil
	default:
		return githubAPIResult{object: map[string]any{"data": parsed}}, nil
	}
}

func newGitHubRateLimitError(status int, body []byte, headers http.Header) *GitHubRateLimitError {
	remaining, limit, reset := parseGitHubRateLimitHeaders(headers)
	bodyLower := strings.ToLower(string(body))
	isRateLimit := remaining == 0 ||
		strings.Contains(bodyLower, "rate limit") ||
		strings.Contains(bodyLower, "api rate limit exceeded") ||
		status == 429
	if !isRateLimit {
		return nil
	}
	msg := "github api rate limit exceeded — try again later or set GITHUB_TOKEN for 5000 req/hr"
	if strings.TrimSpace(os.Getenv("GITHUB_TOKEN")) == "" {
		msg += " (no GITHUB_TOKEN configured)"
	}
	return &GitHubRateLimitError{
		Message:   msg,
		Remaining: remaining,
		Limit:     limit,
		Reset:     reset,
		Status:    status,
	}
}

func parseGitHubRateLimitHeaders(headers http.Header) (remaining, limit int, reset time.Time) {
	if headers == nil {
		return 0, 0, time.Time{}
	}
	remaining, _ = strconv.Atoi(headers.Get("X-RateLimit-Remaining"))
	limit, _ = strconv.Atoi(headers.Get("X-RateLimit-Limit"))
	if resetUnix, err := strconv.ParseInt(headers.Get("X-RateLimit-Reset"), 10, 64); err == nil && resetUnix > 0 {
		reset = time.Unix(resetUnix, 0).UTC()
	}
	return remaining, limit, reset
}

func rateLimitInfoFromError(err error, tokenConfigured bool) map[string]any {
	info := map[string]any{
		"limited":         true,
		"tokenConfigured": tokenConfigured,
	}
	if rl, ok := isGitHubRateLimitError(err); ok {
		info["remaining"] = rl.Remaining
		info["limit"] = rl.Limit
		info["status"] = rl.Status
		info["message"] = rl.Error()
		if !rl.Reset.IsZero() {
			info["resetAt"] = rl.Reset.Format(time.RFC3339)
		}
	} else if err != nil {
		info["message"] = err.Error()
	}
	return info
}

func (g *GitHubClient) FetchOrgs(username string) ([]map[string]any, error) {
	orgs, err := g.apiGetArray(githubAPIURL("/users/" + urlPathEscape(username) + "/orgs"))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(orgs))
	for _, org := range orgs {
		out = append(out, map[string]any{
			"login":     org["login"],
			"name":      org["description"],
			"html_url":  org["html_url"],
			"avatar_url": org["avatar_url"],
		})
	}
	return out, nil
}

func isImportableRepo(repo map[string]any) bool {
	fork, _ := repo["fork"].(bool)
	if !fork {
		return true
	}
	desc, _ := repo["description"].(string)
	if strings.TrimSpace(desc) != "" {
		return true
	}
	stars, _ := repo["stargazers_count"].(float64)
	return stars > 0
}

func selectImportRepos(repos []map[string]any, maxRepos int) []map[string]any {
	eligible := make([]map[string]any, 0, len(repos))
	for _, repo := range repos {
		if isImportableRepo(repo) {
			eligible = append(eligible, repo)
		}
	}
	if len(eligible) > maxRepos {
		eligible = eligible[:maxRepos]
	}
	return eligible
}

func aggregateProgrammingLanguages(repos []map[string]any) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, repo := range repos {
		lang, _ := repo["language"].(string)
		lang = strings.TrimSpace(lang)
		if lang == "" {
			continue
		}
		if _, ok := seen[lang]; ok {
			continue
		}
		seen[lang] = struct{}{}
		out = append(out, lang)
	}
	sort.Strings(out)
	return out
}

func buildImportRepoEntry(repo map[string]any) map[string]any {
	name, _ := repo["name"].(string)
	desc, _ := repo["description"].(string)
	url, _ := repo["html_url"].(string)
	lang, _ := repo["language"].(string)
	stars, _ := repo["stargazers_count"].(float64)
	topics, _ := repo["topics"].([]any)
	entry := map[string]any{
		"name":        name,
		"title":       name,
		"description": desc,
		"url":         url,
		"language":    lang,
		"stars":       stars,
		"topics":      topics,
	}
	if desc != "" {
		entry["suggestedProblem"] = desc
	}
	if stars > 0 {
		entry["suggestedResult"] = fmt.Sprintf("%.0f GitHub stars", stars)
	}
	return entry
}

func (g *GitHubClient) FetchProfile(username string) (map[string]any, error) {
	profile, err := g.apiGet(githubAPIURL("/users/" + urlPathEscape(username)))
	if err != nil {
		return nil, err
	}
	return summarizeGitHubProfile(profile), nil
}

func (g *GitHubClient) FetchRepos(username string) ([]map[string]any, error) {
	repos, err := g.apiGetArray(githubReposAPIURL(username))
	if err != nil {
		return nil, err
	}
	return summarizeAndSortGitHubRepos(repos), nil
}

// FetchAuthenticatedUserRepos lists repos for the OAuth token owner via GET /user/repos.
func (g *GitHubClient) FetchAuthenticatedUserRepos(maxResults int) ([]map[string]any, error) {
	repos, err := g.fetchAuthenticatedUserReposRaw(maxResults)
	if err != nil {
		return nil, err
	}
	return summarizeAndSortGitHubRepos(repos), nil
}

// fetchAllAuthenticatedUserRepos paginates GET /user/repos until all pages are retrieved.
func (g *GitHubClient) fetchAllAuthenticatedUserRepos() ([]map[string]any, error) {
	return g.fetchAuthenticatedUserReposRaw(0)
}

func (g *GitHubClient) fetchAuthenticatedUserReposRaw(maxResults int) ([]map[string]any, error) {
	if !g.HasToken() {
		return nil, fmt.Errorf("github oauth token required")
	}
	perPage := githubUserReposPageSize
	if maxResults > 0 && maxResults < perPage {
		perPage = maxResults
	}
	var all []map[string]any
	for page := 1; page <= githubUserReposMaxPages; page++ {
		repos, err := g.apiGetArray(githubUserReposPageAPIURL(perPage, page))
		if err != nil {
			if page > 1 && len(all) > 0 && isGitHubPaginationStopError(err) {
				break
			}
			return nil, err
		}
		if len(repos) == 0 {
			break
		}
		all = append(all, repos...)
		if maxResults > 0 && len(all) >= maxResults {
			all = all[:maxResults]
			break
		}
		if len(repos) < perPage {
			break
		}
	}
	return all, nil
}

func isGitHubPaginationStopError(err error) bool {
	if err == nil {
		return false
	}
	if _, ok := isGitHubRateLimitError(err); ok {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "http 404") ||
		strings.Contains(msg, "not found")
}

func githubAPIBodyPreview(body string) string {
	const maxLen = 160
	body = strings.ReplaceAll(body, "\n", " ")
	body = strings.ReplaceAll(body, "\r", " ")
	if len(body) <= maxLen {
		return body
	}
	return body[:maxLen] + "…"
}

func summarizeAndSortGitHubRepos(repos []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(repos))
	for _, repo := range repos {
		out = append(out, summarizeGitHubRepo(repo))
	}
	sort.SliceStable(out, func(i, j int) bool {
		si, _ := out[i]["stargazers_count"].(float64)
		sj, _ := out[j]["stargazers_count"].(float64)
		if si != sj {
			return si > sj
		}
		ni, _ := out[i]["name"].(string)
		nj, _ := out[j]["name"].(string)
		return ni < nj
	})
	return out
}

func (g *GitHubClient) FetchRepo(owner, repo string) (map[string]any, error) {
	detail, err := g.apiGet(githubRepoAPIURL(owner, repo))
	if err != nil {
		return nil, err
	}
	return summarizeGitHubRepo(detail), nil
}

// CrawlProfile fetches a GitHub profile via the API. Pass web for HTML/web_search fallback on rate limits.
func (g *GitHubClient) CrawlProfile(rawURL string, maxRepos int, progress ToolProgress, web *WebClient) (map[string]any, error) {
	if progress == nil {
		progress = noopToolProgress{}
	}
	username := githubUsernameFromURL(rawURL)
	if username == "" {
		return nil, fmt.Errorf("not a valid github profile url")
	}
	if maxRepos <= 0 {
		maxRepos = defaultGitHubMaxRepos
	}
	if maxRepos > maxGitHubMaxRepos {
		maxRepos = maxGitHubMaxRepos
	}

	result, crawlErr := g.crawlProfileAPI(username, maxRepos, progress)
	if crawlErr == nil {
		return result, nil
	}
	if hasGitHubImportData(result) {
		result = applyGitHubRateLimitPartial(result, crawlErr, g.token != "")
		return result, nil
	}
	if web != nil {
		if fallback, fbErr := g.crawlProfileFallback(web, username, maxRepos, progress, crawlErr); fbErr == nil {
			return fallback, nil
		}
	}
	return result, crawlErr
}

func (g *GitHubClient) crawlProfileAPI(username string, maxRepos int, progress ToolProgress) (map[string]any, error) {
	requestedUsername := username
	profileURL := githubProfilePageURL(username)
	var authLogin string
	var allowedOwners map[string]bool
	var orgs []map[string]any

	if g.HasToken() {
		if login, err := g.authenticatedLogin(); err == nil && login != "" {
			authLogin = login
			username = login
			profileURL = githubProfilePageURL(login)
			orgs, _ = g.FetchOrgs(login)
			allowedOwners = buildAllowedRepoOwners(login, orgs)
		}
	}

	var profile map[string]any
	var repos []map[string]any
	var profileErr, reposErr error

	progress.StepStart("fetch_url", map[string]any{"url": profileURL})
	profile, profileErr = g.FetchProfile(username)
	profileExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": profileURL}}
	if profileErr != nil {
		profileExec.Error = profileErr.Error()
	} else {
		profileExec.Result = profile
	}
	progress.StepEnd(profileExec)

	var reposAPI string
	if authLogin != "" {
		reposAPI = githubUserReposAPIURL(30)
		progress.StepStart("fetch_url", map[string]any{"url": reposAPI})
		repos, reposErr = g.FetchAuthenticatedUserRepos(30)
	} else {
		reposAPI = githubReposAPIURL(username)
		progress.StepStart("fetch_url", map[string]any{"url": reposAPI})
		repos, reposErr = g.FetchRepos(username)
	}
	reposExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": reposAPI}}
	if reposErr != nil {
		reposExec.Error = reposErr.Error()
	} else {
		reposExec.Result = map[string]any{"count": len(repos)}
	}
	progress.StepEnd(reposExec)

	crawlErr := coalesceGitHubCrawlError(profileErr, reposErr)
	if profile == nil && len(repos) == 0 {
		return nil, crawlErr
	}

	repos = filterReposByAllowedOwners(repos, allowedOwners)
	importCandidates := selectImportRepos(repos, maxRepos)
	importRepos := make([]map[string]any, 0, len(importCandidates))
	for _, repo := range importCandidates {
		importRepos = append(importRepos, buildImportRepoEntry(repo))
	}

	programmingLanguages := aggregateProgrammingLanguages(repos)
	targetCount := len(importRepos)

	result := map[string]any{
		"source":               "github_api",
		"profileUrl":           profileURL,
		"username":             username,
		"profile":              profile,
		"repos":                repos,
		"repoDetails":          importCandidates,
		"importRepos":          importRepos,
		"reposForImport":       targetCount,
		"reposFetched":         len(importCandidates),
		"organizations":        orgs,
		"programmingLanguages": programmingLanguages,
		"importNote":           buildGitHubImportNote(targetCount, false, ""),
	}
	if authLogin != "" {
		result["authenticatedAs"] = authenticatedAsField(authLogin)
		result["importNote"] = buildAuthenticatedGitHubImportNote(targetCount, authLogin)
	}
	if requestedUsername != "" && authLogin != "" && !strings.EqualFold(requestedUsername, authLogin) {
		result["requestedProfileUrl"] = githubProfilePageURL(requestedUsername)
		result["requestedUsername"] = requestedUsername
		result["profileUrlIgnored"] = true
	}
	if crawlErr != nil {
		result = applyGitHubRateLimitPartial(result, crawlErr, g.token != "")
	}
	return result, crawlErr
}

func coalesceGitHubCrawlError(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

func hasGitHubImportData(result map[string]any) bool {
	if result == nil {
		return false
	}
	if importRepos, ok := result["importRepos"].([]map[string]any); ok && len(importRepos) > 0 {
		return true
	}
	if repos, ok := result["repos"].([]map[string]any); ok && len(repos) > 0 {
		return true
	}
	if profile, ok := result["profile"].(map[string]any); ok && len(profile) > 0 {
		return true
	}
	return false
}

func applyGitHubRateLimitPartial(result map[string]any, crawlErr error, tokenConfigured bool) map[string]any {
	if result == nil {
		result = map[string]any{}
	}
	importCount := 0
	if importRepos, ok := result["importRepos"].([]map[string]any); ok {
		importCount = len(importRepos)
	}
	result["rateLimitPartial"] = true
	result["rateLimit"] = rateLimitInfoFromError(crawlErr, tokenConfigured)
	result["importNote"] = buildGitHubImportNote(importCount, true, crawlErr.Error())
	return result
}

func buildAuthenticatedGitHubImportNote(importCount int, authLogin string) string {
	base := buildGitHubImportNote(importCount, false, "")
	return fmt.Sprintf(
		"Authenticated as @%s — import ONLY repos in importRepos/importItems for this account (includes org repos you belong to). "+
			"Do not import repos from web_search or other GitHub profiles. %s",
		authLogin,
		base,
	)
}

func buildGitHubImportNote(importCount int, partial bool, limitMsg string) string {
	base := fmt.Sprintf(
		"Create one create_twin_entry (type PROJECT) per repo in importRepos (%d repos). "+
			"Use suggestedProblem/suggestedResult when PAR fields are thin. "+
			"When building a CV: add_section_item on PROJECTS for each (metadata.url), "+
			"and add programming languages to SKILLS (not LANGUAGES). "+
			"Do not stop after one repo.",
		importCount,
	)
	if !partial {
		return base
	}
	note := fmt.Sprintf(
		"PARTIAL GitHub import (%d repos retrieved). GitHub API rate limit was hit%s. "+
			"Import every item in importRepos — do not give up. "+
			"Tell the user briefly in English what was imported and that some repos may be missing. "+
			"%s",
		importCount,
		tokenHintSuffix(),
		base,
	)
	if limitMsg != "" {
		note = strings.TrimSpace(note)
	}
	return note
}

func tokenHintSuffix() string {
	if strings.TrimSpace(os.Getenv("GITHUB_TOKEN")) == "" {
		return " (no GITHUB_TOKEN — set one for 5000 req/hr)"
	}
	return ""
}

func (g *GitHubClient) crawlProfileFallback(web *WebClient, username string, maxRepos int, progress ToolProgress, apiErr error) (map[string]any, error) {
	profileURL := githubProfilePageURL(username)
	reposURL := profileURL + "?tab=repositories"

	var profileHTML, reposHTML string
	progress.StepStart("fetch_url", map[string]any{"url": profileURL, "fallback": true})
	if body, _, err := web.FetchBody(profileURL, maxFetchBytes); err == nil {
		profileHTML = body
	}
	progress.StepEnd(Execution{Tool: "fetch_url", Arguments: map[string]any{"url": profileURL}, Result: map[string]any{"fallback": true}})

	progress.StepStart("fetch_url", map[string]any{"url": reposURL, "fallback": true})
	if body, _, err := web.FetchBody(reposURL, maxFetchBytes); err == nil {
		reposHTML = body
	}
	progress.StepEnd(Execution{Tool: "fetch_url", Arguments: map[string]any{"url": reposURL}, Result: map[string]any{"fallback": true}})

	repos := parseGitHubReposFromHTML(username, reposHTML)
	if len(repos) == 0 && profileHTML != "" {
		repos = parseGitHubReposFromHTML(username, profileHTML)
	}

	var webSearchFallback any
	searchQuery := fmt.Sprintf("github.com/%s repos", username)
	progress.StepStart("web_search", map[string]any{"query": searchQuery, "fallback": true})
	if search, err := web.Search(searchQuery); err == nil {
		webSearchFallback = search
		repos = mergeGitHubReposFromSearch(username, repos, search, maxRepos)
	}
	searchExec := Execution{Tool: "web_search", Arguments: map[string]any{"query": searchQuery}}
	if webSearchFallback != nil {
		searchExec.Result = map[string]any{"fallback": true}
	}
	progress.StepEnd(searchExec)

	if len(repos) == 0 && profileHTML == "" {
		return nil, apiErr
	}

	if maxRepos > 0 && len(repos) > maxRepos {
		repos = repos[:maxRepos]
	}
	importRepos := make([]map[string]any, 0, len(repos))
	for _, repo := range repos {
		importRepos = append(importRepos, buildImportRepoEntry(repo))
	}

	profile := map[string]any{
		"login":    username,
		"html_url": profileURL,
	}
	if name := parseGitHubDisplayNameFromHTML(profileHTML); name != "" {
		profile["name"] = name
	}
	if bio := parseGitHubBioFromHTML(profileHTML); bio != "" {
		profile["bio"] = bio
	}

	targetCount := len(importRepos)
	result := map[string]any{
		"source":               "github_html_fallback",
		"profileUrl":           profileURL,
		"username":             username,
		"profile":              profile,
		"repos":                repos,
		"repoDetails":          repos,
		"importRepos":          importRepos,
		"reposForImport":       targetCount,
		"reposFetched":         targetCount,
		"programmingLanguages": aggregateProgrammingLanguages(repos),
		"rateLimitPartial":     true,
		"rateLimit":            rateLimitInfoFromError(apiErr, g.token != ""),
		"importNote": buildGitHubImportNote(targetCount, true,
			"used HTML/web_search fallback after GitHub API rate limit"),
	}
	if webSearchFallback != nil {
		result["webSearchFallback"] = webSearchFallback
	}
	return result, nil
}

var (
	githubHTMLDisplayNamePattern = regexp.MustCompile(`(?i)<span[^>]*class="[^"]*p-name[^"]*"[^>]*>([^<]+)</span>`)
	githubHTMLBioPattern         = regexp.MustCompile(`(?i)<div[^>]*class="[^"]*user-profile-bio[^"]*"[^>]*>([\s\S]*?)</div>`)
)

func parseGitHubDisplayNameFromHTML(html string) string {
	match := githubHTMLDisplayNamePattern.FindStringSubmatch(html)
	if len(match) < 2 {
		return ""
	}
	return strings.TrimSpace(tagPattern.ReplaceAllString(match[1], ""))
}

func parseGitHubBioFromHTML(html string) string {
	match := githubHTMLBioPattern.FindStringSubmatch(html)
	if len(match) < 2 {
		return ""
	}
	return strings.TrimSpace(spacePattern.ReplaceAllString(tagPattern.ReplaceAllString(match[1], " "), " "))
}

var githubReservedRepoNames = map[string]bool{
	"repositories": true, "projects": true, "packages": true, "stars": true,
	"followers": true, "following": true, "sponsors": true,
}

func parseGitHubReposFromHTML(username, html string) []map[string]any {
	if html == "" {
		return nil
	}
	userLower := strings.ToLower(username)
	seen := map[string]struct{}{}
	out := make([]map[string]any, 0)
	for _, match := range githubHTMLRepoLinkPattern.FindAllStringSubmatch(html, -1) {
		if len(match) < 3 {
			continue
		}
		owner, name := match[1], match[2]
		if strings.ToLower(owner) != userLower {
			continue
		}
		if githubReservedRepoNames[strings.ToLower(name)] {
			continue
		}
		key := strings.ToLower(name)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, summarizeGitHubRepo(map[string]any{
			"name":     name,
			"html_url": fmt.Sprintf("https://github.com/%s/%s", owner, name),
		}))
	}
	sort.SliceStable(out, func(i, j int) bool {
		ni, _ := out[i]["name"].(string)
		nj, _ := out[j]["name"].(string)
		return ni < nj
	})
	return out
}

func mergeGitHubReposFromSearch(username string, repos []map[string]any, search any, maxRepos int) []map[string]any {
	seen := map[string]struct{}{}
	for _, repo := range repos {
		if name, _ := repo["name"].(string); name != "" {
			seen[strings.ToLower(name)] = struct{}{}
		}
	}
	m, ok := search.(map[string]any)
	if !ok {
		return repos
	}
	results, _ := m["results"].([]map[string]string)
	if results == nil {
		if anyResults, ok := m["results"].([]any); ok {
			for _, item := range anyResults {
				entry, ok := item.(map[string]string)
				if !ok {
					if em, ok := item.(map[string]any); ok {
						entry = map[string]string{}
						if u, ok := em["url"].(string); ok {
							entry["url"] = u
						}
						if t, ok := em["title"].(string); ok {
							entry["title"] = t
						}
					}
				}
				if entry != nil {
					results = append(results, entry)
				}
			}
		}
	}
	userLower := strings.ToLower(username)
	for _, hit := range results {
		hitURL := hit["url"]
		if hitURL == "" {
			continue
		}
		owner, repoName, ok := githubRepoFromURL(hitURL)
		if !ok || strings.ToLower(owner) != userLower {
			continue
		}
		key := strings.ToLower(repoName)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		repos = append(repos, summarizeGitHubRepo(map[string]any{
			"name":        repoName,
			"html_url":    hitURL,
			"description": hit["title"],
		}))
		if maxRepos > 0 && len(repos) >= maxRepos {
			break
		}
	}
	return repos
}

func (g *GitHubClient) FetchURL(rawURL string) (map[string]any, error) {
	if username := githubUsernameFromURL(rawURL); username != "" {
		profile, err := g.FetchProfile(username)
		if err != nil {
			return nil, err
		}
		repos, _ := g.FetchRepos(username)
		return map[string]any{
			"url":        githubProfilePageURL(username),
			"source":     "github_api",
			"profile":    profile,
			"repos":      repos,
			"reposCount": len(repos),
			"note":       "GitHub profiles are fetched via the public API (HTML pages are mostly JavaScript). Use crawl_github_profile to read individual repos.",
		}, nil
	}
	if owner, repo, ok := githubRepoFromURL(rawURL); ok {
		detail, err := g.FetchRepo(owner, repo)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"url":    rawURL,
			"source": "github_api",
			"repo":   detail,
		}, nil
	}
	return nil, fmt.Errorf("not a github url")
}

func needsGitHubAPIFallback(rawURL string, htmlResult map[string]any) bool {
	if !strings.Contains(strings.ToLower(rawURL), "github.com") {
		return false
	}
	if isGitHubProfileURL(rawURL) || isGitHubRepoURL(rawURL) {
		return true
	}
	text, _ := htmlResult["text"].(string)
	return len(strings.TrimSpace(text)) < minGitHubProfileText
}

func summarizeGitHubProfile(profile map[string]any) map[string]any {
	return map[string]any{
		"login":        profile["login"],
		"name":         profile["name"],
		"bio":          profile["bio"],
		"company":      profile["company"],
		"location":     profile["location"],
		"blog":         profile["blog"],
		"html_url":     profile["html_url"],
		"avatar_url":   profile["avatar_url"],
		"public_repos": profile["public_repos"],
		"followers":    profile["followers"],
		"following":    profile["following"],
		"created_at":   profile["created_at"],
	}
}

func summarizeGitHubRepo(repo map[string]any) map[string]any {
	topics, _ := repo["topics"].([]any)
	fork, _ := repo["fork"].(bool)
	return map[string]any{
		"name":              repo["name"],
		"full_name":         repo["full_name"],
		"html_url":          repo["html_url"],
		"description":       repo["description"],
		"language":          repo["language"],
		"fork":              fork,
		"stargazers_count":  repo["stargazers_count"],
		"forks_count":       repo["forks_count"],
		"topics":            topics,
		"created_at":        repo["created_at"],
		"updated_at":        repo["updated_at"],
		"pushed_at":         repo["pushed_at"],
		"homepage":          repo["homepage"],
	}
}

func urlPathEscape(s string) string {
	return strings.NewReplacer(" ", "%20").Replace(s)
}

const (
	defaultGitHubSearchResults = 10
	maxGitHubSearchResults     = 30
)

// Search finds GitHub repositories. When listUserRepos is true and a token is set, includes the authenticated user's repos.
func (g *GitHubClient) Search(query string, listUserRepos bool, maxResults int) (map[string]any, error) {
	query = strings.TrimSpace(query)
	if query == "" && !(listUserRepos && g.HasToken()) {
		return nil, fmt.Errorf("query is required")
	}
	if maxResults <= 0 {
		maxResults = defaultGitHubSearchResults
	}
	if maxResults > maxGitHubSearchResults {
		maxResults = maxGitHubSearchResults
	}

	out := map[string]any{
		"query":              query,
		"authenticated":      g.HasToken(),
		"repositories":       []map[string]any{},
		"userRepositories":   []map[string]any{},
		"importRepositories": []map[string]any{},
	}

	if listUserRepos && g.HasToken() {
		login, err := g.authenticatedLogin()
		if err != nil {
			return nil, err
		}
		out["authenticatedAs"] = authenticatedAsField(login)
		out["userLogin"] = login

		userRepos, err := g.fetchAllAuthenticatedUserRepos()
		if err != nil {
			if rl, ok := isGitHubRateLimitError(err); ok {
				out["rateLimit"] = rateLimitInfoFromError(rl, g.HasToken())
			}
			return nil, err
		}
		orgs, _ := g.FetchOrgs(login)
		allowed := buildAllowedRepoOwners(login, orgs)
		userRepos = filterReposByAllowedOwners(userRepos, allowed)

		out["totalRepos"] = len(userRepos)
		out["allRepoNames"] = sampleRepoNames(userRepos, 20)

		needle := strings.ToLower(strings.TrimSpace(query))
		filtered := userRepos
		if needle != "" {
			filtered = make([]map[string]any, 0, len(userRepos))
			for _, repo := range userRepos {
				if githubRepoMatchesQuery(repo, needle) {
					filtered = append(filtered, repo)
				}
			}
		}
		out["matchedCount"] = len(filtered)

		summaries := summarizeAndSortGitHubRepos(filtered)
		if len(summaries) > maxResults {
			summaries = summaries[:maxResults]
		}
		if needle != "" && len(filtered) == 0 {
			out["suggestion"] = fmt.Sprintf(
				"No repo matched %q. Your repos include: %s",
				query,
				strings.Join(out["allRepoNames"].([]string), ", "),
			)
		}
		out["userRepositories"] = summaries
		out["importRepositories"] = summaries
		out["repositories"] = summaries
		out["importNote"] = fmt.Sprintf(
			"Import ONLY repos in importRepositories/userRepositories for %s (%d matched of %d total). Do not use global GitHub search or web_search profile URLs.",
			authenticatedAsField(login),
			len(filtered),
			len(userRepos),
		)
		if profile, profileErr := g.FetchProfile(login); profileErr == nil {
			out["profile"] = profile
			enrichGitHubProfileResult(out)
		}
		return out, nil
	}

	searchPath := githubAPIURL(fmt.Sprintf(
		"/search/repositories?q=%s&per_page=%d&sort=updated",
		url.QueryEscape(query),
		maxResults,
	))
	searchResult, err := g.apiGet(searchPath)
	if err != nil {
		if rl, ok := isGitHubRateLimitError(err); ok {
			out["rateLimit"] = rateLimitInfoFromError(rl, g.HasToken())
		}
		return nil, err
	}
	if items, ok := searchResult["items"].([]any); ok {
		repos := make([]map[string]any, 0, len(items))
		for _, item := range items {
			if repo, ok := item.(map[string]any); ok {
				repos = append(repos, summarizeGitHubRepo(repo))
			}
		}
		out["repositories"] = repos
	}
	if total, ok := searchResult["total_count"].(float64); ok {
		out["totalCount"] = int(total)
	}

	return out, nil
}

func (g *GitHubClient) authenticatedLogin() (string, error) {
	profile, err := g.apiGet(githubAPIURL("/user"))
	if err != nil {
		return "", err
	}
	login, _ := profile["login"].(string)
	login = strings.TrimSpace(login)
	if login == "" {
		return "", fmt.Errorf("github api returned empty user profile")
	}
	return login, nil
}

func sampleRepoNames(repos []map[string]any, limit int) []string {
	if limit <= 0 {
		limit = 20
	}
	names := make([]string, 0, len(repos))
	for _, repo := range repos {
		if name, ok := repo["name"].(string); ok && strings.TrimSpace(name) != "" {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	if len(names) > limit {
		names = names[:limit]
	}
	return names
}

var repoSearchNormalizePattern = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeRepoSearchText(s string) string {
	return repoSearchNormalizePattern.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "")
}

func splitRepoNameTokens(name string) []string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	parts := strings.FieldsFunc(name, func(r rune) bool {
		return r == '-' || r == '_' || r == '.' || r == ' '
	})
	out := make([]string, 0, len(parts)+1)
	out = append(out, name)
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func levenshteinDistance(a, b string) int {
	if a == b {
		return 0
	}
	if len(a) == 0 {
		return len(b)
	}
	if len(b) == 0 {
		return len(a)
	}
	if len(a) > len(b) {
		a, b = b, a
	}
	prev := make([]int, len(a)+1)
	curr := make([]int, len(a)+1)
	for i := range prev {
		prev[i] = i
	}
	for j := 1; j <= len(b); j++ {
		curr[0] = j
		for i := 1; i <= len(a); i++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			curr[i] = minInt(
				curr[i-1]+1,
				prev[i]+1,
				prev[i-1]+cost,
			)
		}
		prev, curr = curr, prev
	}
	return prev[len(a)]
}

func minInt(values ...int) int {
	if len(values) == 0 {
		return 0
	}
	m := values[0]
	for _, v := range values[1:] {
		if v < m {
			m = v
		}
	}
	return m
}

func githubRepoMatchesQuery(repo map[string]any, needle string) bool {
	needle = strings.ToLower(strings.TrimSpace(needle))
	if needle == "" {
		return true
	}
	fields := []string{
		fmt.Sprint(repo["name"]),
		fmt.Sprint(repo["full_name"]),
		fmt.Sprint(repo["description"]),
		fmt.Sprint(repo["language"]),
	}
	if topics, ok := repo["topics"].([]any); ok {
		for _, topic := range topics {
			fields = append(fields, fmt.Sprint(topic))
		}
	}
	combined := strings.ToLower(strings.Join(fields, " "))
	if strings.Contains(combined, needle) {
		return true
	}
	normNeedle := normalizeRepoSearchText(needle)
	if normNeedle != "" {
		for _, field := range fields {
			if strings.Contains(normalizeRepoSearchText(field), normNeedle) {
				return true
			}
		}
	}
	if len(needle) >= 3 {
		maxDist := 2
		if len(needle) <= 4 {
			maxDist = 1
		}
		name, _ := repo["name"].(string)
		for _, token := range splitRepoNameTokens(name) {
			tokenLower := strings.ToLower(token)
			if strings.Contains(tokenLower, needle) || strings.Contains(needle, tokenLower) {
				return true
			}
			if levenshteinDistance(tokenLower, needle) <= maxDist {
				return true
			}
		}
	}
	return false
}
