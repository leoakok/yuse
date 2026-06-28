package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

const (
	defaultLinkedInProfileAPIURL = "https://www.kocgencyetenek.com/api/linkedin-profile"
	linkedInProfileTimeout       = 30 * time.Second
	maxLinkedInProfileResponse   = 2 * 1024 * 1024
)

var linkedInProfilePathPattern = regexp.MustCompile(`(?i)^/in/([a-zA-Z0-9\-_%]+)/?$`)

// LinkedInProfileClient fetches full LinkedIn profiles via a server-side API.
type LinkedInProfileClient struct {
	apiURL string
	apiKey string
	client *http.Client
}

func NewLinkedInProfileClientFromEnv() *LinkedInProfileClient {
	apiURL := strings.TrimSpace(os.Getenv("LINKEDIN_PROFILE_API_URL"))
	if apiURL == "" {
		apiURL = defaultLinkedInProfileAPIURL
	}
	return NewLinkedInProfileClient(apiURL, strings.TrimSpace(os.Getenv("LINKEDIN_PROFILE_API_KEY")))
}

func NewLinkedInProfileClient(apiURL, apiKey string) *LinkedInProfileClient {
	return &LinkedInProfileClient{
		apiURL: strings.TrimSpace(apiURL),
		apiKey: strings.TrimSpace(apiKey),
		client: &http.Client{Timeout: linkedInProfileTimeout},
	}
}

func isLinkedInProfileURL(rawURL string) bool {
	return validateLinkedInProfileURL(rawURL) == nil
}

func validateLinkedInProfileURL(rawURL string) error {
	rawURL = normalizeLinkedInProfileURL(rawURL)
	if rawURL == "" {
		return fmt.Errorf("profile URL is required")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid LinkedIn profile URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http and https LinkedIn profile URLs are allowed")
	}
	host := strings.ToLower(parsed.Hostname())
	if host != "linkedin.com" && !strings.HasSuffix(host, ".linkedin.com") {
		return fmt.Errorf("URL must be a linkedin.com/in/ profile")
	}
	if isLinkedInJobURL(rawURL) {
		return fmt.Errorf("LinkedIn job URLs are not supported by this tool — use fetch_url")
	}
	if !linkedInProfilePathPattern.MatchString(parsed.Path) {
		return fmt.Errorf("URL must be a linkedin.com/in/ profile path")
	}
	return nil
}

func normalizeLinkedInProfileURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}
	if !strings.Contains(strings.ToLower(rawURL), "://") {
		rawURL = "https://" + rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	parsed.Fragment = ""
	parsed.RawQuery = ""
	path := strings.TrimSuffix(parsed.Path, "/")
	if path == "" {
		path = parsed.Path
	}
	parsed.Path = path
	return parsed.String()
}

func linkedInProfileURLFromArgs(args map[string]any) string {
	for _, key := range []string{"profileUrl", "profile_url", "url"} {
		if u, ok := optionalString(args, key); ok && u != "" {
			return u
		}
	}
	return ""
}

func (c *LinkedInProfileClient) FetchProfile(profileURL, email string) (map[string]any, error) {
	if c == nil || c.apiURL == "" {
		return nil, fmt.Errorf("linkedin profile API is not configured")
	}
	profileURL = normalizeLinkedInProfileURL(profileURL)
	if err := validateLinkedInProfileURL(profileURL); err != nil {
		return nil, err
	}
	email = strings.TrimSpace(email)
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}

	payload, err := json.Marshal(map[string]string{
		"email":       email,
		"profile_url": profileURL,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, c.apiURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("linkedin profile fetch failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxLinkedInProfileResponse))
	if err != nil {
		return nil, fmt.Errorf("read linkedin profile response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := strings.TrimSpace(string(body))
		if len(msg) > 200 {
			msg = msg[:200] + "…"
		}
		if msg == "" {
			msg = resp.Status
		}
		return nil, fmt.Errorf("linkedin profile API returned HTTP %d: %s", resp.StatusCode, msg)
	}

	return normalizeLinkedInProfileResponse(body, profileURL)
}

func normalizeLinkedInProfileResponse(body []byte, profileURL string) (map[string]any, error) {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return nil, fmt.Errorf("linkedin profile API returned an empty response")
	}

	result := map[string]any{
		"profileUrl": profileURL,
		"source":     "linkedin_profile",
	}

	var raw any
	if err := json.Unmarshal(body, &raw); err != nil {
		text := strings.TrimSpace(string(body))
		if text == "" {
			return nil, fmt.Errorf("invalid linkedin profile response")
		}
		result["text"] = text
		return result, nil
	}

	switch v := raw.(type) {
	case map[string]any:
		result["profile"] = v
		if text := extractLinkedInProfileText(v); text != "" {
			result["text"] = text
		}
	case string:
		result["text"] = v
	default:
		result["profile"] = raw
	}

	if _, ok := result["text"]; !ok {
		if encoded, err := json.Marshal(raw); err == nil {
			result["text"] = string(encoded)
		}
	}
	return result, nil
}

func extractLinkedInProfileText(data map[string]any) string {
	for _, key := range []string{"text", "profile", "content", "body", "summary", "data"} {
		if v, ok := data[key]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	parts := make([]string, 0, 8)
	for _, key := range []string{"name", "fullName", "headline", "title", "about", "summary", "experience", "education", "skills"} {
		if v, ok := data[key]; ok {
			switch typed := v.(type) {
			case string:
				if s := strings.TrimSpace(typed); s != "" {
					parts = append(parts, s)
				}
			default:
				if encoded, err := json.Marshal(typed); err == nil && len(encoded) > 2 {
					parts = append(parts, string(encoded))
				}
			}
		}
	}
	return strings.Join(parts, "\n\n")
}
