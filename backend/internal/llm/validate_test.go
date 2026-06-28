package llm

import (
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func TestSanitizeAgentReplyReplacesUnsavedClaims(t *testing.T) {
	reply := "I've created a CV for Elon Musk with experience at SpaceX."
	got := SanitizeAgentReply(reply, nil)
	if got == reply {
		t.Fatalf("expected sanitized reply, got unchanged text")
	}
}

func TestSanitizeAgentReplyKeepsSuccessfulWrites(t *testing.T) {
	reply := "I've created your resume."
	got := SanitizeAgentReply(reply, []mcp.Execution{{Tool: "create_resume"}})
	if got != reply {
		t.Fatalf("expected original reply, got %q", got)
	}
}

func TestSanitizeAgentReplyTrimsVerboseTailorSummary(t *testing.T) {
	reply := "I have tailored your CV for the role. Here are the key updates made:\n\n- **Professional Summary**: Highlighted .NET\n- **Work Experience**: Emphasized roles"
	exec := []mcp.Execution{{Tool: "create_resume", Result: map[string]any{"title": "Tailored CV"}}}
	got := SanitizeAgentReply(reply, exec)
	if strings.Contains(got, "key updates") {
		t.Fatalf("expected brief confirmation, got %q", got)
	}
	if !strings.Contains(got, "Tailored CV") {
		t.Fatalf("expected resume title in brief reply, got %q", got)
	}
}

func TestSanitizeAgentReplyReplacesDeferredCreateOffer(t *testing.T) {
	reply := "Here is a biography. Would you like me to create a detailed CV for him?"
	got := SanitizeAgentReply(reply, nil)
	if got == reply {
		t.Fatalf("expected sanitized reply for deferred create offer")
	}
}

func TestSanitizeAgentReplyKeepsAfterWebSearchOnly(t *testing.T) {
	reply := "I found some information online about the company."
	got := SanitizeAgentReply(reply, []mcp.Execution{{Tool: "web_search"}})
	if got != reply {
		t.Fatalf("web_search alone should not trigger sanitize for short benign reply, got %q", got)
	}
}

func TestSanitizeAgentReplyReplacesMarkdownCVDump(t *testing.T) {
	reply := `### Contact
Email: your.email@example.com

### Summary
Experienced leader.

### Experience
- CEO at Example Corp`
	got := SanitizeAgentReply(reply, []mcp.Execution{{Tool: "web_search"}})
	if got == reply {
		t.Fatal("expected markdown CV dump to be sanitized")
	}
}

func TestSanitizeAgentReplyReplacesResearchOnlyLongReply(t *testing.T) {
	reply := strings.Repeat("Here are details from the site about their career. ", 5)
	got := SanitizeAgentReply(reply, []mcp.Execution{{Tool: "fetch_url"}})
	if got == reply {
		t.Fatal("expected long reply after fetch-only to be sanitized")
	}
}

func TestShouldNudgeResumeWritesAfterSearchOnly(t *testing.T) {
	if !shouldNudgeResumeWrites("create a CV from leo.useefficiently.com", []mcp.Execution{{Tool: "web_search"}}, "") {
		t.Fatal("expected nudge after web_search with create intent")
	}
}

func TestShouldNudgeResumeWritesForTailorJobPrompt(t *testing.T) {
	prompt := "check this CV and create proper version for https://www.linkedin.com/jobs/view/4426941735"
	if !shouldNudgeResumeWrites(prompt, []mcp.Execution{{Tool: "web_search"}}, "") {
		t.Fatal("expected nudge after web_search with tailor/job intent")
	}
}

func TestShouldNotNudgeAfterCreateResume(t *testing.T) {
	if shouldNudgeResumeWrites("create a CV", []mcp.Execution{{Tool: "create_resume"}}, "Created your resume.") {
		t.Fatal("expected no nudge after successful create_resume")
	}
}

func TestShouldNotNudgeWhenAskingSkillGap(t *testing.T) {
	reply := "This role wants .NET experience — do you have any I should highlight?"
	execs := []mcp.Execution{{Tool: "fetch_url"}, {Tool: "get_resume_content"}, {Tool: "list_twin_entries"}}
	prompt := "tailor my CV for this job posting https://example.com/jobs/dotnet-dev"
	if shouldNudgeResumeWrites(prompt, execs, reply) {
		t.Fatal("expected no nudge when agent asks about a missing skill")
	}
}

func TestShouldNotNudgeJobTrackerWhenAskingSkillGap(t *testing.T) {
	reply := "The posting requires .NET — do you have experience with it?"
	execs := []mcp.Execution{{Tool: "web_search"}, {Tool: "list_twin_entries"}}
	if shouldNudgeJobTracker("track this job", model.AssistantContextInput{View: model.AssistantViewJobTracker}, execs, reply) {
		t.Fatal("expected no job tracker nudge when asking about skill gap")
	}
}

func TestSanitizeAgentReplyKeepsSkillGapQuestion(t *testing.T) {
	reply := "This role needs .NET — do you have any experience I should add?"
	got := SanitizeAgentReply(reply, []mcp.Execution{{Tool: "fetch_url"}})
	if got != reply {
		t.Fatalf("expected skill gap question to be kept, got %q", got)
	}
}

func TestIsInteractiveClarificationSTARFollowUp(t *testing.T) {
	if !isInteractiveClarification("What changed after you shipped that rewrite?") {
		t.Fatal("expected STAR follow-up to count as interactive clarification")
	}
}

func TestShouldNotNudgeWhenAskingSTARFollowUp(t *testing.T) {
	reply := "What was the outcome on conversion after that migration?"
	execs := []mcp.Execution{{Tool: "list_twin_entries"}}
	prompt := "I led a payments rewrite at Acme"
	if shouldNudgeResumeWrites(prompt, execs, reply) {
		t.Fatal("expected no nudge when agent asks STAR follow-up")
	}
}

func TestIsInteractiveClarificationSkillGap(t *testing.T) {
	if !isInteractiveClarification("Do you have experience with Kubernetes?") {
		t.Fatal("expected short skill question to count as interactive clarification")
	}
	if isInteractiveClarification("I've created your tailored resume with .NET skills.") {
		t.Fatal("persistence claim should not count as clarification")
	}
}
