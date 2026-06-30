package llm

import (
	"context"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// classifyOffline exercises the deterministic fast-path + heuristic layers
// (no API key) used in tests and offline.
func classifyOffline(text string, ctx model.AssistantContextInput) Classification {
	s := &Service{}
	return s.Classify(context.Background(), text, ctx, nil)
}

func TestClassifyOutOfScopeBuy(t *testing.T) {
	class := classifyOffline("buy", model.AssistantContextInput{View: model.AssistantViewResumes})
	if class.Category != model.AssistantCategoryOutOfScope {
		t.Fatalf("expected OUT_OF_SCOPE for 'buy', got %s", class.Category)
	}
	if !IsScopeHandled(class.Category) {
		t.Fatal("OUT_OF_SCOPE should be scope-handled")
	}
	reply := ScopeReply(class, "buy")
	if !strings.Contains(strings.ToLower(reply), "can't help") && !strings.Contains(strings.ToLower(reply), "outside") {
		t.Fatalf("expected a friendly decline, got %q", reply)
	}
}

func TestClassifyUnclearShortToken(t *testing.T) {
	class := classifyOffline("ad", model.AssistantContextInput{View: model.AssistantViewResumes})
	if class.Category != model.AssistantCategoryUnclear {
		t.Fatalf("expected UNCLEAR for 'ad', got %s", class.Category)
	}
	reply := ScopeReply(class, "ad")
	if !strings.Contains(reply, `"ad"`) {
		t.Fatalf("expected quoted message in clarification, got %q", reply)
	}
}

func TestClassifyGreeting(t *testing.T) {
	class := classifyOffline("hi", model.AssistantContextInput{View: model.AssistantViewResumes})
	if class.Category != model.AssistantCategoryChitchat {
		t.Fatalf("expected CHITCHAT for 'hi', got %s", class.Category)
	}
}

func TestClassifyCreateCV(t *testing.T) {
	class := classifyOffline("create a CV from my LinkedIn", model.AssistantContextInput{View: model.AssistantViewResumes})
	if class.Category != model.AssistantCategoryCreateCv {
		t.Fatalf("expected CREATE_CV, got %s", class.Category)
	}
	if IsScopeHandled(class.Category) {
		t.Fatal("CREATE_CV should run the agent, not be scope-handled")
	}
}

func TestClassifyInScopeKeywordNotOutOfScope(t *testing.T) {
	// "weather app" is a project, not a weather request.
	class := classifyOffline("add my weather app project to my portfolio", model.AssistantContextInput{View: model.AssistantViewPortfolios})
	if class.Category == model.AssistantCategoryOutOfScope {
		t.Fatalf("portfolio project should not be out of scope, got %s", class.Category)
	}
}

func TestClassifyAccountInfoQuestions(t *testing.T) {
	ctx := model.AssistantContextInput{View: model.AssistantViewResumes}
	for _, text := range []string{
		"how many cvs do I have",
		"how many resumes do I have",
		"list my resumes",
		"list my cvs",
		"show my portfolios",
	} {
		class := classifyOffline(text, ctx)
		if IsScopeHandled(class.Category) {
			t.Fatalf("%q should run the agent, got scope-handled %s", text, class.Category)
		}
		if class.Category != model.AssistantCategoryAdvice {
			t.Fatalf("%q expected ADVICE, got %s", text, class.Category)
		}
		if class.Source != "fast-path" {
			t.Fatalf("%q expected fast-path, got %s", text, class.Source)
		}
	}
}

func TestClassifyCapabilitiesQuestions(t *testing.T) {
	ctx := model.AssistantContextInput{View: model.AssistantViewResumes}
	for _, text := range []string{
		"what can you do",
		"help",
		"how can you help me",
	} {
		class := classifyOffline(text, ctx)
		if IsScopeHandled(class.Category) {
			t.Fatalf("%q should run the agent, got scope-handled %s", text, class.Category)
		}
		if class.Category != model.AssistantCategoryAdvice {
			t.Fatalf("%q expected ADVICE, got %s", text, class.Category)
		}
	}
}

func TestClassifyHelpWithTaskNotCapabilities(t *testing.T) {
	class := classifyOffline("help me tailor my resume", model.AssistantContextInput{View: model.AssistantViewResumes})
	if class.Category == model.AssistantCategoryChitchat || class.Category == model.AssistantCategoryUnclear {
		t.Fatalf("task-specific help should not be scope-handled, got %s", class.Category)
	}
}

func TestShouldBlockHighImpactTool(t *testing.T) {
	if !shouldBlockHighImpactTool(model.AssistantCategoryUnclear, "create_resume") {
		t.Fatal("expected create_resume blocked when UNCLEAR")
	}
	if !shouldBlockHighImpactTool(model.AssistantCategoryOutOfScope, "fetch_linkedin_profile") {
		t.Fatal("expected linkedin import blocked when OUT_OF_SCOPE")
	}
	if shouldBlockHighImpactTool(model.AssistantCategoryCreateCv, "create_resume") {
		t.Fatal("create_resume should be allowed for CREATE_CV")
	}
	if shouldBlockHighImpactTool(model.AssistantCategoryUnclear, "list_resumes") {
		t.Fatal("read tools should never be blocked")
	}
}

func TestWorkflowContinuation(t *testing.T) {
	history := []*model.AssistantMessage{
		{Role: model.AssistantMessageRoleAssistant, Content: "Want me to import your LinkedIn profile?"},
	}
	if !isWorkflowContinuation("yes", history) {
		t.Fatal("expected 'yes' to continue workflow")
	}
	if isWorkflowContinuation("ad", history) {
		t.Fatal("'ad' is not a continuation")
	}
}

func TestSelectKnowledgeByCategory(t *testing.T) {
	entries := []*model.KnowledgeEntry{
		{ID: "a", Category: model.AssistantCategoryCreateCv, Tags: []string{"cv-best-practices"}, Enabled: true, Title: "CV"},
		{ID: "b", Category: model.AssistantCategoryOutOfScope, Tags: []string{"scope"}, Enabled: true, Title: "Scope"},
		{ID: "c", Category: model.AssistantCategoryJobApplication, Tags: []string{"cover-letter"}, Enabled: true, Title: "Cover"},
	}
	class := Classification{Category: model.AssistantCategoryCreateCv, Tags: []string{"cover-letter"}}
	selected := SelectKnowledge(entries, class)
	if len(selected) == 0 || selected[0].ID != "a" {
		t.Fatalf("expected category match first, got %+v", selected)
	}
	// Tag overlap should pull in the cover-letter entry too.
	foundCover := false
	for _, e := range selected {
		if e.ID == "c" {
			foundCover = true
		}
	}
	if !foundCover {
		t.Fatal("expected tag-overlap entry to be selected")
	}
	guidance := BuildKnowledgeGuidance(class.Category, selected)
	if !strings.Contains(guidance, "CREATE_CV") {
		t.Fatalf("expected guidance to mention category, got %q", guidance)
	}
}
