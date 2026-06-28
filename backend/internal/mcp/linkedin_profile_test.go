package mcp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateLinkedInProfileURL(t *testing.T) {
	valid := []string{
		"https://www.linkedin.com/in/janedoe",
		"https://linkedin.com/in/janedoe/",
		"https://tr.linkedin.com/in/janedoe",
		"linkedin.com/in/janedoe",
	}
	for _, raw := range valid {
		if err := validateLinkedInProfileURL(raw); err != nil {
			t.Fatalf("expected valid profile url %q, got %v", raw, err)
		}
	}

	invalid := []string{
		"https://www.linkedin.com/jobs/view/123",
		"https://www.linkedin.com/company/acme",
		"https://example.com/in/janedoe",
		"https://www.linkedin.com/in/",
		"",
	}
	for _, raw := range invalid {
		if err := validateLinkedInProfileURL(raw); err == nil {
			t.Fatalf("expected invalid profile url %q", raw)
		}
	}
}

func TestIsLinkedInProfileURL(t *testing.T) {
	if !isLinkedInProfileURL("https://www.linkedin.com/in/usersid") {
		t.Fatal("expected linkedin profile url")
	}
	if isLinkedInProfileURL("https://www.linkedin.com/jobs/view/123") {
		t.Fatal("expected job url to be rejected")
	}
}

func TestLinkedInProfileClientFetch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
			t.Fatalf("expected json content type, got %q", ct)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer test-key" {
			t.Fatalf("expected bearer auth, got %q", auth)
		}
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body["email"] != "user@example.com" {
			t.Fatalf("unexpected email %q", body["email"])
		}
		if body["profile_url"] != "https://www.linkedin.com/in/janedoe" {
			t.Fatalf("unexpected profile_url %q", body["profile_url"])
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"name":     "Jane Doe",
			"headline": "Staff Engineer",
			"about":    "Built platforms at scale.",
		})
	}))
	defer server.Close()

	client := NewLinkedInProfileClient(server.URL, "test-key")
	result, err := client.FetchProfile("https://www.linkedin.com/in/janedoe", "user@example.com")
	if err != nil {
		t.Fatalf("FetchProfile: %v", err)
	}
	if result["source"] != "linkedin_profile" {
		t.Fatalf("unexpected source %#v", result["source"])
	}
	text, _ := result["text"].(string)
	if !strings.Contains(text, "Jane Doe") || !strings.Contains(text, "Staff Engineer") {
		t.Fatalf("expected profile text, got %q", text)
	}
}

func TestToolActivityStartLabelLinkedInProfile(t *testing.T) {
	label := ToolActivityStartLabel("fetch_linkedin_profile", map[string]any{
		"profileUrl": "https://www.linkedin.com/in/janedoe",
	})
	if !strings.Contains(label, "linkedin.com/in/janedoe") {
		t.Fatalf("expected linkedin url in label, got %q", label)
	}
	if strings.Contains(label, "kocgencyetenek") {
		t.Fatal("label must not expose upstream API host")
	}
}
