package linkedin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	voyagerJobCardsPath = "/voyager/api/voyagerJobsDashJobCards"
	defaultTimeFilter   = "r7200"
	defaultCount        = 25
)

// JobCard is a normalized LinkedIn job search result.
type JobCard struct {
	JobID     string `json:"jobId"`
	Title     string `json:"title"`
	Company   string `json:"company,omitempty"`
	Location  string `json:"location,omitempty"`
	ListedAt  string `json:"listedAt,omitempty"`
	URL       string `json:"url"`
}

// SearchJobs queries LinkedIn Voyager job search (admin tooling).
// Requires LINKEDIN_SESSION_COOKIE (li_at cookie value) in the environment.
func SearchJobs(ctx context.Context, keywords, geoID, timeFilter string) ([]JobCard, error) {
	cookie := strings.TrimSpace(os.Getenv("LINKEDIN_SESSION_COOKIE"))
	if cookie == "" {
		return nil, fmt.Errorf("LINKEDIN_SESSION_COOKIE is not configured")
	}
	keywords = strings.TrimSpace(keywords)
	if keywords == "" {
		return nil, fmt.Errorf("keywords are required")
	}
	if strings.TrimSpace(timeFilter) == "" {
		timeFilter = defaultTimeFilter
	}

	query := buildJobSearchQuery(keywords, geoID, timeFilter)
	params := url.Values{}
	params.Set("decorationId", "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174")
	params.Set("count", fmt.Sprintf("%d", defaultCount))
	params.Set("q", "jobSearch")
	params.Set("query", query)

	reqURL := "https://www.linkedin.com" + voyagerJobCardsPath + "?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.linkedin.normalized+json+2.1")
	req.Header.Set("Cookie", "li_at="+cookie)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; YuseAdmin/1.0)")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("linkedin request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read linkedin response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("linkedin HTTP %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	return parseJobCards(body)
}

func buildJobSearchQuery(keywords, geoID, timeFilter string) string {
	escapedKeywords := url.QueryEscape(keywords)
	parts := []string{
		"origin:JOB_SEARCH_PAGE_SEARCH_BUTTON",
		"keywords:" + escapedKeywords,
	}
	if geoID = strings.TrimSpace(geoID); geoID != "" {
		parts = append(parts, "locationUnion:(geoId:"+geoID+")")
	}
	parts = append(parts, "selectedFilters:(sortBy:List(DD),timePostedRange:List("+timeFilter+"))")
	return "(" + strings.Join(parts, ",") + ")"
}

func parseJobCards(body []byte) ([]JobCard, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parse linkedin json: %w", err)
	}

	elements, _ := payload["elements"].([]any)
	if len(elements) == 0 {
		included, _ := payload["included"].([]any)
		return parseIncludedJobs(included), nil
	}

	out := make([]JobCard, 0, len(elements))
	for _, el := range elements {
		m, ok := el.(map[string]any)
		if !ok {
			continue
		}
		if card := jobCardFromElement(m); card.JobID != "" {
			out = append(out, card)
		}
	}
	if len(out) == 0 {
		included, _ := payload["included"].([]any)
		out = parseIncludedJobs(included)
	}
	return out, nil
}

func parseIncludedJobs(included []any) []JobCard {
	out := make([]JobCard, 0)
	for _, item := range included {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		typ, _ := m["$type"].(string)
		if !strings.Contains(typ, "JobPosting") && !strings.Contains(typ, "JobCard") {
			continue
		}
		if card := jobCardFromElement(m); card.JobID != "" {
			out = append(out, card)
		}
	}
	return out
}

func jobCardFromElement(m map[string]any) JobCard {
	jobID := firstString(m, "jobPostingUrn", "entityUrn", "trackingUrn")
	jobID = extractNumericID(jobID)
	title := firstString(m, "title", "jobTitle")
	company := ""
	if companyRef, ok := m["companyName"].(map[string]any); ok {
		company = firstString(companyRef, "text", "name")
	} else {
		company = firstString(m, "companyName", "company")
	}
	location := ""
	if locRef, ok := m["formattedLocation"].(map[string]any); ok {
		location = firstString(locRef, "text")
	} else {
		location = firstString(m, "formattedLocation", "location")
	}
	listedAt := firstString(m, "listedAt", "originalListedAt")
	url := firstString(m, "jobPostingUrl", "url")
	if url == "" && jobID != "" {
		slug := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
		url = fmt.Sprintf("https://www.linkedin.com/jobs/view/%s-%s", slug, jobID)
	}
	return JobCard{
		JobID:    jobID,
		Title:    title,
		Company:  company,
		Location: location,
		ListedAt: listedAt,
		URL:      url,
	}
}

func firstString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if v, ok := m[key].(string); ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func extractNumericID(urn string) string {
	urn = strings.TrimSpace(urn)
	if urn == "" {
		return ""
	}
	parts := strings.Split(urn, ":")
	last := parts[len(parts)-1]
	if idx := strings.LastIndex(last, ","); idx >= 0 {
		last = last[idx+1:]
	}
	return strings.TrimSpace(last)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
