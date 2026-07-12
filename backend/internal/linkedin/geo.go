package linkedin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const guestGeoTypeaheadURL = "https://www.linkedin.com/jobs-guest/api/typeaheadHits"

// GeoLocation is a LinkedIn geo filter suggestion.
type GeoLocation struct {
	GeoID string `json:"geoId"`
	Label string `json:"label"`
}

// SearchGeoLocations resolves human-readable place names to LinkedIn geoIds.
func SearchGeoLocations(ctx context.Context, keywords string) ([]GeoLocation, error) {
	keywords = strings.TrimSpace(keywords)
	if len(keywords) < 2 {
		return nil, nil
	}

	reqURL := guestGeoTypeaheadURL + "?typeaheadType=GEO&query=" + url.QueryEscape(keywords)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", defaultUserAgent)

	resp, err := voyagerHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("linkedin geo search: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		return nil, fmt.Errorf("read linkedin geo response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, linkedInHTTPError(resp.StatusCode, body)
	}

	return parseGuestGeoHits(body)
}

func parseGuestGeoHits(body []byte) ([]GeoLocation, error) {
	var hits []struct {
		ID          string `json:"id"`
		Type        string `json:"type"`
		DisplayName string `json:"displayName"`
	}
	if err := json.Unmarshal(body, &hits); err != nil {
		return nil, fmt.Errorf("parse linkedin geo json: %w", err)
	}

	out := make([]GeoLocation, 0, len(hits))
	seen := make(map[string]struct{}, len(hits))
	for _, hit := range hits {
		if !strings.EqualFold(hit.Type, "GEO") {
			continue
		}
		geoID := strings.TrimSpace(hit.ID)
		label := strings.TrimSpace(hit.DisplayName)
		if geoID == "" || label == "" {
			continue
		}
		if _, ok := seen[geoID]; ok {
			continue
		}
		seen[geoID] = struct{}{}
		out = append(out, GeoLocation{GeoID: geoID, Label: label})
	}
	return out, nil
}
