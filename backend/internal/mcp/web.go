package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	maxFetchBytes       = 512 * 1024
	maxTextChars        = 8000
	maxCrawlTextPerPage = 4000
	maxInternalLinks    = 30
	defaultCrawlPages   = 10
	maxCrawlPages       = 12
	fetchTimeout        = 12 * time.Second
	maxSearchHits       = 5
	browserUserAgent    = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

var htmlBlockPattern = regexp.MustCompile(`(?is)<(script|style|noscript)[^>]*>.*?</(script|style|noscript)>`)
var tagPattern = regexp.MustCompile(`(?s)<[^>]+>`)
var spacePattern = regexp.MustCompile(`\s+`)
var hrefPattern = regexp.MustCompile(`(?i)<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']`)

var linkPriorityKeywords = []string{"about", "project", "work", "experience", "resume", "cv", "blog", "portfolio", "career", "publication", "award", "volunteer", "skill"}

var navPathBlacklist = []string{
	"/login", "/signin", "/signup", "/register", "/auth", "/oauth",
	"/pricing", "/plans", "/enterprise", "/features", "/product",
	"/privacy", "/terms", "/legal", "/cookies", "/gdpr", "/imprint",
	"/contact", "/support", "/help", "/faq", "/status", "/docs",
	"/careers", "/jobs", "/press", "/media", "/security", "/trust",
	"/marketplace", "/explore", "/trending", "/topics", "/sponsors",
	"/download", "/app", "/mobile", "/integrations", "/partners",
}

var commonSitePaths = []string{
	"/about", "/about-me", "/about-us", "/bio",
	"/projects", "/project", "/portfolio", "/work", "/works",
	"/experience", "/resume", "/cv", "/career", "/careers",
	"/publications", "/awards", "/volunteer", "/skills",
}

var sitemapLocPattern = regexp.MustCompile(`(?i)<loc>\s*([^<\s]+)\s*</loc>`)

// WebClient performs bounded web search and URL fetches for the assistant.
type WebClient struct {
	tavilyKey string
	client    *http.Client
}

func NewWebClientFromEnv() *WebClient {
	return &WebClient{
		tavilyKey: strings.TrimSpace(os.Getenv("TAVILY_API_KEY")),
		client: &http.Client{
			Timeout: fetchTimeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 5 {
					return fmt.Errorf("too many redirects")
				}
				return validateFetchURL(req.URL.String())
			},
		},
	}
}

func (w *WebClient) Search(query string) (any, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, fmt.Errorf("query is required")
	}
	result, err := w.searchDuckDuckGo(query)
	if err == nil {
		if m, ok := result.(map[string]any); ok {
			if results, ok := m["results"].([]map[string]string); ok && len(results) > 0 {
				return m, nil
			}
		}
		err = fmt.Errorf("duckduckgo returned no results for %q — try a shorter or more specific query", query)
	}
	if w.tavilyKey != "" {
		if tavily, tavilyErr := w.searchTavily(query); tavilyErr == nil {
			return tavily, nil
		}
	}
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("duckduckgo returned no results for %q", query)
}

func normalizeFetchURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return rawURL
	}
	if !strings.Contains(rawURL, "://") {
		return "https://" + rawURL
	}
	return rawURL
}

func (w *WebClient) Fetch(rawURL string) (map[string]any, error) {
	page, err := w.fetchPage(rawURL, maxTextChars)
	if err != nil {
		return nil, err
	}
	result := page.toMap()
	if isHTMLContent(page.contentType, page.body) {
		if links := extractInternalLinks(page.body, page.url); len(links) > 0 {
			result["internalLinks"] = links
		}
	}
	return result, nil
}

// FetchBody returns the raw response body for HTML parsing (e.g. GitHub fallback).
func (w *WebClient) FetchBody(rawURL string, maxBytes int) (body string, status int, err error) {
	if maxBytes <= 0 {
		maxBytes = maxFetchBytes
	}
	page, err := w.fetchPage(rawURL, maxBytes)
	if err != nil {
		return "", 0, err
	}
	return page.body, page.status, nil
}

// CrawlSite fetches a site's homepage and prioritized same-origin pages (about, projects, etc.).
func (w *WebClient) CrawlSite(rawURL string, maxPages int) (map[string]any, error) {
	return w.ExploreSite(rawURL, maxPages, noopToolProgress{})
}

// ExploreSite aggressively explores a website: homepage, sitemap, common paths, and prioritized links.
func (w *WebClient) ExploreSite(rawURL string, maxPages int, progress ToolProgress) (map[string]any, error) {
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
		maxPages = defaultCrawlPages
	}
	if maxPages > maxCrawlPages {
		maxPages = maxCrawlPages
	}

	base, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	var pages []map[string]any
	var discovered []string
	var profile map[string]any

	fetchOne := func(target string, label string) bool {
		canon := canonicalPageURL(target)
		if seen[canon] {
			return false
		}
		seen[canon] = true
		progress.StepStart("fetch_url", map[string]any{"url": target})
		page, fetchErr := w.fetchPage(target, maxCrawlTextPerPage)
		stepExec := Execution{Tool: "fetch_url", Arguments: map[string]any{"url": target}}
		if fetchErr != nil {
			stepExec.Error = fetchErr.Error()
			progress.StepEnd(stepExec)
			return false
		}
		stepExec.Result = map[string]any{"status": page.status, "label": label}
		progress.StepEnd(stepExec)
		pages = append(pages, page.toExploreMap())
		if profile == nil {
			if p := profileFromJSONLD(extractJSONLDBlocks(page.body)); p != nil {
				profile = p
			}
		}
		if isHTMLContent(page.contentType, page.body) {
			links := extractInternalLinks(page.body, page.url)
			discovered = appendUniqueStrings(discovered, links)
		}
		return true
	}

	fetchOne(rawURL, "homepage")

	if len(pages) < maxPages {
		for _, probe := range buildCommonPathURLs(base) {
			if len(pages) >= maxPages {
				break
			}
			fetchOne(probe, "common_path")
		}
	}

	if len(pages) < maxPages {
		for _, smURL := range w.fetchSitemapURLs(base) {
			if len(pages) >= maxPages {
				break
			}
			fetchOne(smURL, "sitemap")
		}
	}

	if len(pages) > 0 {
		homeURL, _ := pages[0]["url"].(string)
		homeBody, _ := pages[0]["body"].(string)
		queue := prioritizeInternalLinks(extractInternalLinks(homeBody, homeURL), homeURL)
		discovered = appendUniqueStrings(discovered, queue)
		for _, link := range queue {
			if len(pages) >= maxPages {
				break
			}
			fetchOne(link, "internal_link")
		}
	}

	strategy := "multi_page_crawl"
	if len(pages) <= 1 {
		strategy = "single_page"
	}

	return map[string]any{
		"baseUrl":         rawURL,
		"strategy":        strategy,
		"pagesFetched":    len(pages),
		"pages":           pages,
		"discoveredLinks": discovered,
		"profile":         profile,
	}, nil
}

type fetchedPage struct {
	url         string
	status      int
	contentType string
	body        string
	text        string
	truncated   bool
}

func (p fetchedPage) toMap() map[string]any {
	return map[string]any{
		"url":         p.url,
		"status":      p.status,
		"contentType": p.contentType,
		"text":        p.text,
		"truncated":   p.truncated,
	}
}

func (p fetchedPage) toExploreMap() map[string]any {
	m := p.toMap()
	m["body"] = p.body
	return m
}

func (w *WebClient) fetchPage(rawURL string, textLimit int) (fetchedPage, error) {
	rawURL = normalizeFetchURL(rawURL)
	if rawURL == "" {
		return fetchedPage{}, fmt.Errorf("url is required")
	}
	if err := validateFetchURL(rawURL); err != nil {
		return fetchedPage{}, err
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, rawURL, nil)
	if err != nil {
		return fetchedPage{}, err
	}
	req.Header.Set("User-Agent", browserUserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8")

	resp, err := w.client.Do(req)
	if err != nil {
		return fetchedPage{}, fmt.Errorf("fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fetchedPage{}, fmt.Errorf("fetch returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFetchBytes))
	if err != nil {
		return fetchedPage{}, fmt.Errorf("read response: %w", err)
	}

	bodyStr := string(body)
	contentType := resp.Header.Get("Content-Type")
	text := extractReadableText(bodyStr, contentType)
	truncated := len(text) > textLimit
	if truncated {
		text = text[:textLimit]
	}

	return fetchedPage{
		url:         rawURL,
		status:      resp.StatusCode,
		contentType: contentType,
		body:        bodyStr,
		text:        text,
		truncated:   truncated,
	}, nil
}

func isHTMLContent(contentType, body string) bool {
	if strings.Contains(strings.ToLower(contentType), "html") {
		return true
	}
	trimmed := strings.TrimSpace(body)
	return strings.HasPrefix(trimmed, "<") && strings.Contains(trimmed, "<a")
}

func extractInternalLinks(html, pageURL string) []string {
	base, err := url.Parse(pageURL)
	if err != nil {
		return nil
	}

	seen := make(map[string]bool)
	var out []string
	for _, match := range hrefPattern.FindAllStringSubmatch(html, -1) {
		if len(match) < 2 {
			continue
		}
		resolved, ok := resolveInternalLink(strings.TrimSpace(match[1]), base)
		if !ok || isNavJunkLink(resolved) {
			continue
		}
		canon := canonicalPageURL(resolved)
		if seen[canon] {
			continue
		}
		seen[canon] = true
		out = append(out, resolved)
		if len(out) >= maxInternalLinks {
			break
		}
	}
	return out
}

func resolveInternalLink(href string, base *url.URL) (string, bool) {
	if href == "" || href == "#" || strings.HasPrefix(href, "#") {
		return "", false
	}
	lower := strings.ToLower(href)
	if strings.HasPrefix(lower, "mailto:") || strings.HasPrefix(lower, "tel:") || strings.HasPrefix(lower, "javascript:") {
		return "", false
	}

	ref, err := url.Parse(href)
	if err != nil {
		return "", false
	}
	resolved := base.ResolveReference(ref)
	if !isSameOrigin(base, resolved) {
		return "", false
	}
	if isAssetPath(strings.ToLower(resolved.Path)) {
		return "", false
	}

	resolved.Fragment = ""
	resolved.RawQuery = ""
	return resolved.String(), true
}

func isSameOrigin(a, b *url.URL) bool {
	return strings.EqualFold(a.Scheme, b.Scheme) && strings.EqualFold(a.Hostname(), b.Hostname())
}

func isAssetPath(path string) bool {
	assetExts := []string{".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".css", ".js", ".woff", ".woff2", ".mp4", ".zip", ".xml", ".json"}
	for _, ext := range assetExts {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

func canonicalPageURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return strings.ToLower(raw)
	}
	u.Fragment = ""
	u.RawQuery = ""
	path := u.Path
	if path == "" {
		path = "/"
	}
	if path != "/" {
		path = strings.TrimSuffix(path, "/")
	}
	u.Path = path
	return strings.ToLower(u.Scheme + "://" + u.Host + path)
}

func prioritizeInternalLinks(links []string, baseURL string) []string {
	baseCanon := canonicalPageURL(baseURL)
	rest := make([]string, 0, len(links))
	for _, link := range links {
		if canonicalPageURL(link) == baseCanon {
			continue
		}
		rest = append(rest, link)
	}
	sort.SliceStable(rest, func(i, j int) bool {
		si := linkPriorityScore(rest[i])
		sj := linkPriorityScore(rest[j])
		if si != sj {
			return si > sj
		}
		return len(rest[i]) < len(rest[j])
	})
	return rest
}

func linkPriorityScore(link string) int {
	lower := strings.ToLower(link)
	if isNavJunkLink(link) {
		return -100
	}
	score := 0
	for _, kw := range linkPriorityKeywords {
		if strings.Contains(lower, kw) {
			score += 10
		}
	}
	return score
}

func isNavJunkLink(link string) bool {
	lower := strings.ToLower(link)
	u, err := url.Parse(lower)
	if err != nil {
		return false
	}
	path := strings.ToLower(u.Path)
	for _, junk := range navPathBlacklist {
		if strings.Contains(path, junk) {
			return true
		}
	}
	if strings.Contains(lower, "github.com") {
		for reserved := range githubReservedPaths {
			if strings.Contains(path, "/"+reserved) {
				return true
			}
		}
	}
	return false
}

func buildCommonPathURLs(base *url.URL) []string {
	root := strings.TrimSuffix(base.Scheme+"://"+base.Host, "/")
	var out []string
	for _, path := range commonSitePaths {
		out = append(out, root+path)
	}
	return out
}

func (w *WebClient) fetchSitemapURLs(base *url.URL) []string {
	root := strings.TrimSuffix(base.Scheme+"://"+base.Host, "/")
	sitemapURL := root + "/sitemap.xml"
	page, err := w.fetchPage(sitemapURL, maxFetchBytes)
	if err != nil {
		return nil
	}
	matches := sitemapLocPattern.FindAllStringSubmatch(page.body, -1)
	seen := map[string]bool{}
	var out []string
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		loc := strings.TrimSpace(match[1])
		if loc == "" || seen[loc] {
			continue
		}
		if isNavJunkLink(loc) {
			continue
		}
		parsed, err := url.Parse(loc)
		if err != nil || !isSameOrigin(base, parsed) {
			continue
		}
		seen[loc] = true
		out = append(out, loc)
		if len(out) >= maxInternalLinks {
			break
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return linkPriorityScore(out[i]) > linkPriorityScore(out[j])
	})
	return out
}

func appendUniqueStrings(dst []string, items []string) []string {
	seen := map[string]bool{}
	for _, s := range dst {
		seen[s] = true
	}
	for _, s := range items {
		if seen[s] {
			continue
		}
		seen[s] = true
		dst = append(dst, s)
	}
	return dst
}

func (w *WebClient) searchTavily(query string) (any, error) {
	payload := map[string]any{
		"api_key":             w.tavilyKey,
		"query":               query,
		"max_results":         maxSearchHits,
		"include_answer":      true,
		"search_depth":        "basic",
		"include_raw_content": false,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, "https://api.tavily.com/search", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := w.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFetchBytes))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("search API returned HTTP %d", resp.StatusCode)
	}

	var parsed map[string]any
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("parse search response: %w", err)
	}
	parsed["provider"] = "tavily"
	parsed["query"] = query
	return parsed, nil
}

func (w *WebClient) searchDuckDuckGo(query string) (any, error) {
	endpoint := "https://html.duckduckgo.com/html/?" + url.Values{"q": {query}}.Encode()
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, endpoint, strings.NewReader(url.Values{"q": {query}}.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", browserUserAgent)

	resp, err := w.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFetchBytes))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("search returned HTTP %d", resp.StatusCode)
	}

	if strings.Contains(strings.ToLower(string(body)), "anomaly-modal") ||
		strings.Contains(strings.ToLower(string(body)), "bots use duckduckgo") {
		return nil, fmt.Errorf("duckduckgo blocked the search request — try again in a moment or rephrase the query")
	}

	results := parseDuckDuckGoResults(string(body), maxSearchHits)
	return map[string]any{
		"provider": "duckduckgo",
		"query":    query,
		"results":  results,
	}, nil
}

var (
	ddgTitleRe   = regexp.MustCompile(`(?is)<a\b[^>]*\bclass="result__a"[^>]*\bhref="([^"]+)"[^>]*>(.*?)</a>`)
	ddgSnippetRe = regexp.MustCompile(`(?is)<a\b[^>]*\bclass="result__snippet"[^>]*>(.*?)</a>`)
)

func parseDuckDuckGoResults(html string, limit int) []map[string]string {
	var out []map[string]string

	titles := ddgTitleRe.FindAllStringSubmatch(html, -1)
	snippets := ddgSnippetRe.FindAllStringSubmatch(html, -1)
	for i, title := range titles {
		if len(out) >= limit {
			break
		}
		if len(title) < 3 {
			continue
		}
		entry := map[string]string{
			"title": strings.TrimSpace(stripHTMLTags(htmlUnescape(title[2]))),
			"url":   strings.TrimSpace(htmlUnescape(title[1])),
		}
		if i < len(snippets) && len(snippets[i]) > 1 {
			entry["snippet"] = strings.TrimSpace(stripHTMLTags(htmlUnescape(snippets[i][1])))
		}
		out = append(out, entry)
	}
	return out
}

func stripHTMLTags(s string) string {
	return strings.TrimSpace(spacePattern.ReplaceAllString(tagPattern.ReplaceAllString(s, " "), " "))
}

func htmlUnescape(s string) string {
	replacer := strings.NewReplacer("&amp;", "&", "&lt;", "<", "&gt;", ">", "&quot;", `"`, "&#39;", "'")
	return replacer.Replace(s)
}

func extractReadableText(body, contentType string) string {
	lower := strings.ToLower(contentType)
	if strings.Contains(lower, "application/json") {
		var pretty bytes.Buffer
		if err := json.Indent(&pretty, []byte(body), "", "  "); err == nil {
			body = pretty.String()
		}
	}

	cleaned := htmlBlockPattern.ReplaceAllString(body, " ")
	cleaned = tagPattern.ReplaceAllString(cleaned, " ")
	cleaned = htmlUnescape(cleaned)
	cleaned = spacePattern.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
}

func validateFetchURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http and https URLs are allowed")
	}
	host := strings.TrimSpace(parsed.Hostname())
	if host == "" {
		return fmt.Errorf("url host is required")
	}
	lowerHost := strings.ToLower(host)
	if lowerHost == "localhost" || strings.HasSuffix(lowerHost, ".localhost") || lowerHost == "0.0.0.0" {
		return fmt.Errorf("localhost URLs are not allowed")
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("could not resolve host: %w", err)
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return fmt.Errorf("URL resolves to a blocked address")
		}
	}
	return nil
}

func isBlockedIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() || ip.IsUnspecified() {
		return true
	}
	// AWS/GCP metadata
	if ip.Equal(net.ParseIP("169.254.169.254")) {
		return true
	}
	blockedRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"169.254.0.0/16",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	}
	for _, cidr := range blockedRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return true
		}
	}
	return false
}
