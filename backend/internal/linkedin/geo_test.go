package linkedin

import "testing"

func TestParseGuestGeoHits(t *testing.T) {
	body := []byte(`[
		{"id":"102424322","type":"GEO","displayName":"Istanbul, Türkiye"},
		{"id":"100170895","type":"GEO","displayName":"Istanbul, Istanbul, Türkiye"},
		{"id":"1441","type":"COMPANY","displayName":"Google"}
	]`)

	got, err := parseGuestGeoHits(body)
	if err != nil {
		t.Fatalf("parseGuestGeoHits: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 geo hits, got %d", len(got))
	}
	if got[0].GeoID != "102424322" || got[0].Label != "Istanbul, Türkiye" {
		t.Fatalf("unexpected first hit: %#v", got[0])
	}
}

func TestSearchGeoLocationsShortQuery(t *testing.T) {
	got, err := SearchGeoLocations(t.Context(), "i")
	if err != nil {
		t.Fatalf("SearchGeoLocations: %v", err)
	}
	if got != nil {
		t.Fatalf("expected nil for short query, got %#v", got)
	}
}
