package linkedin

import (
	"fmt"
	"net/http"
	"net/url"
	"time"
)

func buildJobSearchURL(params SearchParams) string {
	query := buildJobSearchQuery(params)
	start := params.Start
	if start < 0 {
		start = 0
	}
	// Voyager expects RestLI query syntax with raw colons/parens (not url.Values.Encode).
	return fmt.Sprintf(
		"https://www.linkedin.com%s?decorationId=%s&count=%d&start=%d&q=jobSearch&query=%s",
		voyagerJobCardsPath,
		url.QueryEscape("com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174"),
		defaultCount,
		start,
		query,
	)
}

func applyVoyagerHeaders(req *http.Request, session sessionCookies) {
	req.Header.Set("Accept", "application/vnd.linkedin.normalized+json+2.1")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Cookie", session.cookieHeader)
	req.Header.Set("csrf-token", session.csrfToken())
	req.Header.Set("Referer", "https://www.linkedin.com/jobs/search/")
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("x-li-lang", "en_US")
	req.Header.Set("x-li-track", defaultLiTrack)
	req.Header.Set("x-restli-protocol-version", "2.0.0")
}

func voyagerHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 20 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}
