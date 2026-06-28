package mcp_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestFetchLinkedInProfileRegistry(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"fullName": "Alex Morgan",
			"headline": "Engineer",
		})
	}))
	defer server.Close()

	t.Setenv("LINKEDIN_PROFILE_API_URL", server.URL)
	t.Setenv("LINKEDIN_PROFILE_API_KEY", "")

	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"profileUrl": "https://www.linkedin.com/in/alexmorgan",
	})
	exec := registry.Execute("fetch_linkedin_profile", args)
	if exec.Error != "" {
		t.Fatalf("fetch_linkedin_profile: %s", exec.Error)
	}
	raw, _ := json.Marshal(exec.Result)
	if !strings.Contains(string(raw), "Alex Morgan") {
		t.Fatalf("expected profile in result, got %s", raw)
	}
}

func TestFetchLinkedInProfileRejectsNonProfileURL(t *testing.T) {
	dataStore := store.NewMemory()
	cvSvc := cv.NewService(dataStore, llm.NewService(config.Config{}), nil)
	registry := mcp.NewRegistry(cvSvc)

	args, _ := json.Marshal(map[string]any{
		"profileUrl": "https://evil.example/in/user",
	})
	exec := registry.Execute("fetch_linkedin_profile", args)
	if exec.Error == "" {
		t.Fatal("expected SSRF rejection")
	}
}
