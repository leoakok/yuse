package linkedin

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

func textFromViewModel(value any) string {
	m, ok := value.(map[string]any)
	if !ok {
		return ""
	}
	if text := firstString(m, "text"); text != "" {
		return text
	}
	if nested, ok := m["text"]; ok && nested != nil {
		if s := textFromViewModel(nested); s != "" {
			return s
		}
	}
	return ""
}

func parseJobCards(body []byte) ([]JobCard, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parse linkedin json: %w", err)
	}

	included, _ := payload["included"].([]any)
	return dedupeJobCards(parseJobPostingCards(included)), nil
}

func parseJobPostingCards(included []any) []JobCard {
	out := make([]JobCard, 0)
	for _, item := range included {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		typ, _ := m["$type"].(string)
		if !strings.Contains(typ, "JobPostingCard") {
			continue
		}
		entityUrn := firstString(m, "entityUrn")
		if !strings.Contains(entityUrn, "JOBS_SEARCH") {
			continue
		}
		if card := jobCardFromPostingCard(m); isValidJobID(card.JobID) {
			out = append(out, card)
		}
	}
	return out
}

func jobCardFromPostingCard(m map[string]any) JobCard {
	jobURL := firstString(m, "jobPostingUrl", "url")
	jobURN := firstString(m, "jobPostingUrn", "entityUrn")
	jobID := extractJobPostingID(jobURN, jobURL)

	title := firstString(m, "jobPostingTitle")
	if title == "" {
		title = textFromViewModel(m["title"])
	}

	company := textFromViewModel(m["primaryDescription"])
	secondary := textFromViewModel(m["secondaryDescription"])
	location, workplace := parseWorkplaceAndLocation(secondary)

	listedAt := listedAtFromFooter(m["footerItems"])
	url := safeLinkedInJobURL(jobURL)
	if url == "" && jobID != "" {
		slug := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
		url = fmt.Sprintf("https://www.linkedin.com/jobs/view/%s-%s", slug, jobID)
	}

	return JobCard{
		JobID:         jobID,
		Title:         title,
		Company:       company,
		Location:      location,
		WorkplaceType: workplace,
		ListedAt:      listedAt,
		URL:           url,
	}
}

func safeLinkedInJobURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme != "https" || parsed.User != nil {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	if host != "linkedin.com" && !strings.HasSuffix(host, ".linkedin.com") {
		return ""
	}
	return parsed.String()
}

func listedAtFromFooter(value any) string {
	items, ok := value.([]any)
	if !ok {
		return ""
	}
	for _, item := range items {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if firstString(m, "type") != "LISTED_DATE" {
			continue
		}
		switch ts := m["timeAt"].(type) {
		case float64:
			return time.UnixMilli(int64(ts)).UTC().Format(time.RFC3339)
		case json.Number:
			if ms, err := ts.Int64(); err == nil {
				return time.UnixMilli(ms).UTC().Format(time.RFC3339)
			}
		case string:
			if ms, err := strconv.ParseInt(ts, 10, 64); err == nil {
				return time.UnixMilli(ms).UTC().Format(time.RFC3339)
			}
		}
	}
	return ""
}
