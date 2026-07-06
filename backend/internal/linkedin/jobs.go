package linkedin

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
)

const (
	voyagerJobCardsPath = "/voyager/api/voyagerJobsDashJobCards"
	defaultTimeFilter   = "r86400"
	defaultCount        = 25
)

var (
	jobPostingURNPattern = regexp.MustCompile(`(?i)jobPosting:(\d{6,})`)
	jobPostingURLPattern = regexp.MustCompile(`(?i)/jobs/view/(?:[^/?#]+-)?(\d{6,})`)
)

// JobCard is a normalized LinkedIn job search result.
type JobCard struct {
	JobID          string `json:"jobId"`
	Title          string `json:"title"`
	Company        string `json:"company,omitempty"`
	Location       string `json:"location,omitempty"`
	WorkplaceType  string `json:"workplaceType,omitempty"`
	EmploymentType string `json:"employmentType,omitempty"`
	ListedAt       string `json:"listedAt,omitempty"`
	Description    string `json:"description,omitempty"`
	URL            string `json:"url"`
}

// SearchJobs queries LinkedIn Voyager job search (admin tooling).
func SearchJobs(ctx context.Context, params SearchParams) ([]JobCard, error) {
	session, err := parseSessionInput(params.SessionCookie)
	if err != nil {
		env := strings.TrimSpace(os.Getenv("LINKEDIN_SESSION_COOKIE"))
		if env == "" {
			return nil, err
		}
		session, err = parseSessionInput(env)
		if err != nil {
			return nil, err
		}
	}

	params.Keywords = strings.TrimSpace(params.Keywords)
	params.GeoID = strings.TrimSpace(params.GeoID)
	if !hasSearchCriteria(params) {
		return nil, fmt.Errorf("enter keywords, a geoId, or at least one filter")
	}
	if strings.TrimSpace(params.TimeFilter) == "" {
		params.TimeFilter = defaultTimeFilter
	}

	reqURL := buildJobSearchURL(params)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	applyVoyagerHeaders(req, session)

	resp, err := voyagerHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("linkedin request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read linkedin response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 300 && resp.StatusCode < 400 {
			return nil, fmt.Errorf("linkedin redirected to login (HTTP %d); refresh cookies from DevTools", resp.StatusCode)
		}
		return nil, linkedInHTTPError(resp.StatusCode, body)
	}

	cards, err := parseJobCards(body)
	if err != nil {
		return nil, err
	}
	return enrichJobDescriptions(ctx, session, cards), nil
}

func buildJobSearchQuery(params SearchParams) string {
	parts := []string{"origin:JOB_SEARCH_PAGE_SEARCH_BUTTON"}
	if params.Keywords != "" {
		escapedKeywords := strings.ReplaceAll(url.QueryEscape(params.Keywords), "+", "%20")
		parts = append(parts, "keywords:"+escapedKeywords)
	}
	if params.GeoID != "" {
		parts = append(parts, "locationUnion:(geoId:"+params.GeoID+")")
	}

	filterParts := []string{
		"sortBy:List(DD)",
		"timePostedRange:List(" + params.TimeFilter + ")",
	}
	if list := restliList(linkedInWorkplaceCodes(params.WorkplaceTypes)); list != "" {
		filterParts = append(filterParts, "workplaceType:"+list)
	}
	if list := restliList(linkedInExperienceCodes(params.ExperienceLevels)); list != "" {
		filterParts = append(filterParts, "experience:"+list)
	}
	if list := restliList(linkedInEmploymentCodes(params.EmploymentTypes)); list != "" {
		filterParts = append(filterParts, "jobType:"+list)
	}
	parts = append(parts, "selectedFilters:("+strings.Join(filterParts, ",")+")")
	return "(" + strings.Join(parts, ",") + ")"
}

func firstString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if v, ok := m[key].(string); ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func extractJobPostingID(urn, jobURL string) string {
	if urn != "" {
		if match := jobPostingURNPattern.FindStringSubmatch(urn); len(match) > 1 {
			return match[1]
		}
	}
	if jobURL != "" {
		if match := jobPostingURLPattern.FindStringSubmatch(jobURL); len(match) > 1 {
			return match[1]
		}
	}
	return ""
}

func isValidJobID(id string) bool {
	if len(id) < 6 {
		return false
	}
	for _, r := range id {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func dedupeJobCards(cards []JobCard) []JobCard {
	seen := make(map[string]struct{}, len(cards))
	out := make([]JobCard, 0, len(cards))
	for _, card := range cards {
		if !isValidJobID(card.JobID) {
			continue
		}
		if _, ok := seen[card.JobID]; ok {
			continue
		}
		seen[card.JobID] = struct{}{}
		out = append(out, card)
	}
	return out
}

func linkedInHTTPError(statusCode int, body []byte) error {
	snippet := truncate(string(body), 200)
	switch statusCode {
	case 401:
		return fmt.Errorf("linkedin session expired (HTTP 401); refresh cookies from DevTools")
	case 403:
		if strings.Contains(snippet, "CSRF") {
			return fmt.Errorf("linkedin CSRF check failed; paste the full Cookie header from a linkedin.com voyager request in the Network tab")
		}
		return fmt.Errorf("linkedin access denied (HTTP 403); paste the full Cookie header from the Network tab, not just li_at")
	default:
		return fmt.Errorf("linkedin HTTP %d: %s", statusCode, snippet)
	}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
