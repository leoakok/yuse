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
	appliedJobsPageSize  = 10
	appliedJobsQueryID   = "voyagerSearchDashClusters.9c3177ca40ed191b452e1074f52445a8"
	appliedJobsGraphPath = "/voyager/api/graphql"
)

// ApplicationCard is a normalized LinkedIn applied job entry.
type ApplicationCard struct {
	JobID              string
	ApplicationURN     string
	Title              string
	Company            string
	Location           string
	URL                string
	AppliedAt          *time.Time
	LinkedInStatus     string
	ViewedAt           *time.Time
	ResumeDownloadedAt *time.Time
	RejectedAt         *time.Time
	RawPayload         map[string]any
}

// ListAppliedJobs fetches the user's applied jobs from LinkedIn Voyager GraphQL.
func ListAppliedJobs(ctx context.Context, sessionCookie string) ([]ApplicationCard, error) {
	session, err := parseSessionInput(sessionCookie)
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

	var all []ApplicationCard
	for start := 0; ; start += appliedJobsPageSize {
		page, total, err := listAppliedJobsPage(ctx, session, start)
		if err != nil {
			return nil, err
		}
		all = append(all, page...)
		if len(page) < appliedJobsPageSize || start+appliedJobsPageSize >= total {
			break
		}
	}
	return dedupeApplications(all), nil
}

func listAppliedJobsPage(ctx context.Context, session sessionCookies, start int) ([]ApplicationCard, int, error) {
	variables := fmt.Sprintf(
		"(start:%d,query:(flagshipSearchIntent:SEARCH_MY_ITEMS_JOB_SEEKER,queryParameters:List((key:cardType,value:List(APPLIED)))))",
		start,
	)
	reqURL := fmt.Sprintf(
		"https://www.linkedin.com%s?variables=%s&queryId=%s",
		appliedJobsGraphPath,
		url.QueryEscape(variables),
		appliedJobsQueryID,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, 0, err
	}
	applyAppliedJobsHeaders(req, session)

	resp, err := voyagerHTTPClient().Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("linkedin applied jobs request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		return nil, 0, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 300 && resp.StatusCode < 400 {
			return nil, 0, fmt.Errorf("linkedin redirected to login (HTTP %d); refresh cookies from DevTools", resp.StatusCode)
		}
		return nil, 0, linkedInHTTPError(resp.StatusCode, body)
	}

	return parseAppliedJobsResponse(body)
}

func applyAppliedJobsHeaders(req *http.Request, session sessionCookies) {
	req.Header.Set("Accept", "application/vnd.linkedin.normalized+json+2.1")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Cookie", session.cookieHeader)
	req.Header.Set("csrf-token", session.csrfToken())
	req.Header.Set("Referer", "https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED")
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("x-li-lang", "en_US")
	req.Header.Set("x-li-track", defaultLiTrack)
	req.Header.Set("x-restli-protocol-version", "2.0.0")
}

func parseAppliedJobsResponse(body []byte) ([]ApplicationCard, int, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, 0, fmt.Errorf("parse applied jobs json: %w", err)
	}

	total := appliedJobsTotal(payload)
	included, _ := payload["included"].([]any)
	cards := parseApplicationCards(included)
	return cards, total, nil
}

func appliedJobsTotal(payload map[string]any) int {
	data, _ := payload["data"].(map[string]any)
	inner, _ := data["data"].(map[string]any)
	clusters, _ := inner["searchDashClustersByAll"].(map[string]any)
	if clusters == nil {
		return 0
	}
	paging, _ := clusters["paging"].(map[string]any)
	if paging == nil {
		return 0
	}
	switch v := paging["total"].(type) {
	case float64:
		return int(v)
	case int:
		return v
	default:
		return 0
	}
}

func parseApplicationCards(included []any) []ApplicationCard {
	out := make([]ApplicationCard, 0)
	for _, item := range included {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		typ, _ := m["$type"].(string)
		if !strings.Contains(typ, "JobPostingCard") && !strings.Contains(typ, "JobSearchCard") {
			continue
		}
		card := applicationCardFromMap(m)
		if card.JobID == "" {
			continue
		}
		out = append(out, card)
	}
	return out
}

func applicationCardFromMap(m map[string]any) ApplicationCard {
	jobURL := firstString(m, "navigationUrl", "jobPostingUrl", "url")
	jobURN := firstString(m, "jobPostingUrn", "entityUrn", "trackingUrn")
	jobID := extractJobPostingID(jobURN, jobURL)

	title := textFromViewModel(m["title"])
	if title == "" {
		title = firstString(m, "jobPostingTitle")
	}
	company := textFromViewModel(m["primaryDescription"])
	if company == "" {
		company = textFromViewModel(m["primarySubtitle"])
	}
	location := textFromViewModel(m["secondaryDescription"])
	if location == "" {
		location = textFromViewModel(m["secondarySubtitle"])
	}

	status, viewedAt, resumeAt, rejectedAt := parseApplicationStatus(m)

	raw := map[string]any{}
	for k, v := range m {
		raw[k] = v
	}

	return ApplicationCard{
		JobID:              jobID,
		ApplicationURN:     jobURN,
		Title:              title,
		Company:            company,
		Location:           location,
		URL:                jobURL,
		LinkedInStatus:     status,
		ViewedAt:           viewedAt,
		ResumeDownloadedAt: resumeAt,
		RejectedAt:         rejectedAt,
		RawPayload:         raw,
	}
}

func parseApplicationStatus(m map[string]any) (status string, viewed, resume, rejected *time.Time) {
	insights, _ := m["insightsResolutionResults"].([]any)
	for _, item := range insights {
		im, ok := item.(map[string]any)
		if !ok {
			continue
		}
		text := strings.ToLower(textFromViewModel(im))
		if text == "" {
			text = strings.ToLower(firstString(im, "text"))
		}
		switch {
		case strings.Contains(text, "resume downloaded"), strings.Contains(text, "downloaded your resume"):
			status = "Resume downloaded"
			t := time.Now().UTC()
			resume = &t
		case strings.Contains(text, "viewed"), strings.Contains(text, "application viewed"):
			if status == "" {
				status = "Application viewed"
			}
			t := time.Now().UTC()
			viewed = &t
		case strings.Contains(text, "rejected"), strings.Contains(text, "not selected"):
			status = "Rejected"
			t := time.Now().UTC()
			rejected = &t
		case strings.Contains(text, "applied"), strings.Contains(text, "submitted"):
			if status == "" {
				status = "Applied"
			}
		}
	}
	if status == "" {
		status = "Applied"
	}
	return status, viewed, resume, rejected
}

func dedupeApplications(cards []ApplicationCard) []ApplicationCard {
	seen := make(map[string]struct{}, len(cards))
	out := make([]ApplicationCard, 0, len(cards))
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
