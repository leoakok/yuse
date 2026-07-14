package mcp_test

import (
	"strings"
	"testing"

	openai "github.com/sashabaranov/go-openai"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestOpenAIToolsExcludesAdminToolsForNonAdmin(t *testing.T) {
	cvSvc := cv.NewService(store.NewMemory(), nil, nil)
	registry := mcp.NewRegistry(cvSvc, false)
	assertToolPresence(t, registry.OpenAITools(), false)
}

func TestOpenAIToolsIncludesAdminToolsForAdmin(t *testing.T) {
	cvSvc := cv.NewService(store.NewMemory(), nil, nil)
	registry := mcp.NewRegistry(cvSvc, true)
	assertToolPresence(t, registry.OpenAITools(), true)
}

func TestToolCatalogExcludesAdminToolsForNonAdmin(t *testing.T) {
	catalog := mcp.ToolCatalog(false)
	for _, name := range []string{"search_linkedin_jobs", "list_linkedin_applications"} {
		if strings.Contains(catalog, name) {
			t.Fatalf("non-admin catalog includes %q", name)
		}
	}
}

func assertToolPresence(t *testing.T, tools []openai.Tool, wantAdmin bool) {
	t.Helper()
	names := make(map[string]bool, len(tools))
	for _, tool := range tools {
		if tool.Function != nil {
			names[tool.Function.Name] = true
		}
	}
	for _, adminName := range []string{"search_linkedin_jobs", "list_linkedin_applications"} {
		got := names[adminName]
		if wantAdmin && !got {
			t.Fatalf("expected admin tool %q", adminName)
		}
		if !wantAdmin && got {
			t.Fatalf("unexpected admin tool %q for non-admin", adminName)
		}
	}
}
