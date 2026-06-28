package mcp

import (
	"net/url"
	"regexp"
	"strings"
)

const minLinkedInJobTextChars = 300

var linkedInJobPathPattern = regexp.MustCompile(`(?i)/jobs/view/(?:[^/]+-)?(\d+)`)

func isLinkedInJobURL(rawURL string) bool {
	lower := strings.ToLower(strings.TrimSpace(rawURL))
	return strings.Contains(lower, "linkedin.com/jobs")
}

func linkedInJobID(rawURL string) string {
	if match := linkedInJobPathPattern.FindStringSubmatch(rawURL); len(match) > 1 {
		return match[1]
	}
	return ""
}

func linkedInJobSlug(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 3 || !strings.EqualFold(parts[0], "jobs") || !strings.EqualFold(parts[1], "view") {
		return ""
	}
	slug := parts[2]
	if id := linkedInJobID(rawURL); id != "" && strings.HasSuffix(slug, "-"+id) {
		slug = strings.TrimSuffix(slug, "-"+id)
	}
	return slug
}

func linkedInJobSearchQuery(rawURL string, fetchResult map[string]any) string {
	slug := linkedInJobSlug(rawURL)
	if slug != "" {
		phrase := strings.ReplaceAll(slug, "-", " ")
		return phrase + " job description requirements"
	}
	if text, ok := fetchResult["text"].(string); ok {
		trimmed := strings.TrimSpace(text)
		if len(trimmed) > 40 {
			return trimmed[:min(120, len(trimmed))] + " job requirements"
		}
	}
	if id := linkedInJobID(rawURL); id != "" {
		return "linkedin job " + id + " requirements"
	}
	return "linkedin job posting requirements"
}

func needsLinkedInJobFallback(rawURL string, result map[string]any) bool {
	if !isLinkedInJobURL(rawURL) {
		return false
	}
	text, _ := result["text"].(string)
	return len(strings.TrimSpace(text)) < minLinkedInJobTextChars
}
