package security

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// ValidateTrackedJobURL ensures a tracked job URL is safe to store and later fetch.
func ValidateTrackedJobURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("url is required")
	}
	if strings.HasPrefix(trimmed, "manual://") {
		return trimmed, nil
	}
	return validateHTTPURL(trimmed)
}

// ValidateExternalURL ensures an external https/http URL is safe to store (contact photos, links).
func ValidateExternalURL(raw string) (string, error) {
	return validateHTTPURL(strings.TrimSpace(raw))
}

func validateHTTPURL(trimmed string) (string, error) {
	if trimmed == "" {
		return "", fmt.Errorf("url is required")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("invalid url")
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", fmt.Errorf("only http and https urls are allowed")
	}
	if parsed.Host == "" {
		return "", fmt.Errorf("invalid url host")
	}
	if isBlockedHost(parsed.Hostname()) {
		return "", fmt.Errorf("url host is not allowed")
	}
	return trimmed, nil
}

func isBlockedHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return true
	}
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return true
	}
	if host == "metadata.google.internal" || host == "metadata" {
		return true
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}
