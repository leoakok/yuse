package linkedin

import (
	"fmt"
	"regexp"
	"strings"
)

const (
	defaultUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
	defaultLiTrack   = `{"clientVersion":"1.13.8960","mpVersion":"1.13.8960","osName":"web","timezoneOffset":180,"timezone":"Europe/Istanbul","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":1,"displayWidth":1920,"displayHeight":1080}`
)

var (
	reLIAt      = regexp.MustCompile(`(?:^|;\s*)li_at=([^;]+)`)
	reJSession  = regexp.MustCompile(`(?i)(?:^|;\s*)JSESSIONID=(?:"([^"]+)"|([^;]+))`)
)

// sessionCookies holds ephemeral LinkedIn auth values for a single Voyager request.
type sessionCookies struct {
	cookieHeader string
	jsessionID   string
}

// parseSessionInput accepts:
//   - li_at=...; JSESSIONID="ajax:..."
//   - full Cookie header from DevTools Network tab (all linkedin.com cookies)
//
// Ephemeral admin test input only; never stored.
func parseSessionInput(raw string) (sessionCookies, error) {
	normalized := normalizeSessionInput(raw)
	if normalized == "" {
		return sessionCookies{}, fmt.Errorf("LinkedIn session cookie is not configured")
	}

	liAt, jsessionID, err := extractSessionValues(normalized)
	if err != nil {
		return sessionCookies{}, err
	}
	if liAt == "" {
		return sessionCookies{}, fmt.Errorf("missing li_at cookie")
	}
	if jsessionID == "" {
		return sessionCookies{}, fmt.Errorf("missing JSESSIONID cookie; paste li_at and JSESSIONID or the full Cookie header from the Network tab")
	}
	csrf := csrfTokenFromJSessionID(jsessionID)
	if csrf == "" {
		return sessionCookies{}, fmt.Errorf("csrf token is empty; JSESSIONID should look like ajax:1234567890")
	}

	cookieHeader := normalized
	if !strings.Contains(strings.ToLower(normalized), `jsessionid="`) {
		cookieHeader = buildMinimalCookieHeader(liAt, jsessionID)
	}

	return sessionCookies{cookieHeader: cookieHeader, jsessionID: jsessionID}, nil
}

func extractSessionValues(raw string) (liAt, jsessionID string, err error) {
	if m := reLIAt.FindStringSubmatch(raw); len(m) > 1 {
		liAt = strings.TrimSpace(m[1])
	}
	if m := reJSession.FindStringSubmatch(raw); len(m) > 1 {
		if m[1] != "" {
			jsessionID = strings.TrimSpace(m[1])
		} else if len(m) > 2 {
			jsessionID = strings.TrimSpace(m[2])
		}
	}
	return liAt, jsessionID, nil
}

// normalizeSessionInput removes textarea line breaks and tabs. Cookie values must not contain whitespace.
func normalizeSessionInput(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.ReplaceAll(raw, "\r\n", "")
	raw = strings.ReplaceAll(raw, "\n", "")
	raw = strings.ReplaceAll(raw, "\r", "")
	raw = strings.ReplaceAll(raw, "\t", "")
	return strings.TrimSpace(raw)
}

func buildMinimalCookieHeader(liAt, jsessionID string) string {
	return "li_at=" + liAt + `; JSESSIONID="` + unquoteCookieValue(jsessionID) + `"`
}

func unquoteCookieValue(value string) string {
	if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
		return value[1 : len(value)-1]
	}
	return value
}

func (s sessionCookies) csrfToken() string {
	return csrfTokenFromJSessionID(s.jsessionID)
}

// csrfTokenFromJSessionID derives the Voyager csrf-token header from JSESSIONID.
func csrfTokenFromJSessionID(jsessionID string) string {
	jsessionID = strings.TrimSpace(unquoteCookieValue(jsessionID))
	if jsessionID == "" {
		return ""
	}
	if strings.HasPrefix(jsessionID, "ajax:") {
		return jsessionID
	}
	return "ajax:" + jsessionID
}
