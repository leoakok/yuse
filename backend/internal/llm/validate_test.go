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

func TestShouldNotNudgeAfterCreateResumePopulated(t *testing.T) {
	execs := []mcp.Execution{{Tool: "create_resume"}, {Tool: "add_section_item"}}
	if shouldNudgeResumeWrites("create a CV", execs, "Created your resume.") {
		t.Fatal("expected no nudge after create_resume with add_section_item")
	}
}

func TestShouldNudgeAfterCreateResumeShellOnly(t *testing.T) {
	if !shouldNudgeResumeWrites("create a CV", []mcp.Execution{{Tool: "create_resume"}}, "Created your resume.") {
		t.Fatal("expected nudge after create_resume shell without section items")
	}
}

func TestShouldNudgeRoleTailorPopulate(t *testing.T) {
	prompt := "create a cv for a forward deployed engineer role"
	base := []mcp.Execution{
		{Tool: "web_search"},
		{Tool: "web_search"},
		{Tool: "list_twin_entries"},
		{Tool: "list_resumes"},
		{Tool: "get_resume_content"},
		{Tool: "create_resume"},
	}
	if !shouldNudgeRoleTailorPopulate(prompt, base, "Created your tailored CV.") {
		t.Fatal("expected role-tailor populate nudge after empty create")
	}
	if shouldNudgeRoleTailorPopulate(prompt, append(base, mcp.Execution{Tool: "add_section_item"}), "") {
		t.Fatal("expected no role-tailor populate nudge after add_section_item")
	}
}

func TestShouldNudgeRoleTailorResearch(t *testing.T) {
	prompt := "create a cv for a forward deployed engineer role"
	execs := []mcp.Execution{{Tool: "list_twin_entries"}, {Tool: "list_resumes"}}
	if !shouldNudgeRoleTailorResearch(prompt, execs, "") {
		t.Fatal("expected research nudge when web_search missing")
	}
	execs = append(execs, mcp.Execution{Tool: "web_search"}, mcp.Execution{Tool: "web_search"})
	if shouldNudgeRoleTailorResearch(prompt, execs, "") {
		t.Fatal("expected no research nudge after two web_search calls")
	}
}

func TestRoleTailorComplete(t *testing.T) {
	prompt := "create a cv for a forward deployed engineer role"
	incomplete := []mcp.Execution{
		{Tool: "web_search"},
		{Tool: "list_twin_entries"},
		{Tool: "list_resumes"},
		{Tool: "create_resume"},
		{Tool: "add_section_item"},
	}
	if roleTailorComplete(prompt, incomplete) {
		t.Fatal("expected incomplete role tailor pipeline")
	}
	complete := []mcp.Execution{
		{Tool: "web_search"},
		{Tool: "web_search"},
		{Tool: "list_twin_entries"},
		{Tool: "list_resumes"},
		{Tool: "get_resume_content"},
		{Tool: "duplicate_resume"},
		{Tool: "add_section_item"},
		{Tool: "add_section_item"},
		{Tool: "add_section_item"},
		{Tool: "get_resume_content"},
	}
	if !roleTailorComplete(prompt, complete) {
		t.Fatal("expected complete role tailor pipeline")
	}
}

func TestLooksLikeThinRoleTailorReply(t *testing.T) {
	if !looksLikeThinRoleTailorReply("Done.") {
		t.Fatal("expected Done to be thin")
	}
	substantive := "Partial fit for forward deployed engineer: your customer-facing work maps well. I researched 3 postings and emphasized deployment and stakeholder skills. Remaining gap: limited on-prem experience."
	if looksLikeThinRoleTailorReply(substantive) {
		t.Fatal("expected substantive reply to pass thin check")
	}
}

func TestLooksLikeDeferredTailorOffer(t *testing.T) {
	reply := "Created the CV shell for a Forward Deployed Engineer and set the title and layout. If you want, I can now tailor it with your real experience and skills."
	if !looksLikeDeferredTailorOffer(reply) {
		t.Fatal("expected deferred tailor offer")
	}
}

func TestRoleTailorNudgeExactFailureReply(t *testing.T) {
	prompt := "create a cv for forward deployed engineer role"
	execs := []mcp.Execution{{Tool: "create_resume"}}
	reply := "Created the CV shell for a Forward Deployed Engineer and set the title and layout. If you want, I can now tailor it with your real experience and skills."
	if !shouldNudgeRoleTailorResearch(prompt, execs, reply) {
		t.Fatal("expected research nudge")
	}
	if !shouldForceRoleTailorContinuation(prompt, execs, reply) {
		t.Fatal("expected force continuation safety net")
	}
}

func TestUserAskedRoleTargetedCV(t *testing.T) {
	if !userAskedRoleTargetedCV("create a cv for a forward deployed engineer role") {
		t.Fatal("expected role-targeted CV intent")
	}
	if userAskedRoleTargetedCV("create a CV from https://example.com") {
		t.Fatal("website import should not count as role-target only")
	}
}

func TestShouldNotNudgeWhenAskingSkillGap(t *testing.T) {
	reply := "This role wants .NET experience, do you have any I should highlight?"
	execs := []mcp.Execution{{Tool: "fetch_url"}, {Tool: "get_resume_content"}, {Tool: "list_twin_entries"}}
	prompt := "tailor my CV for this job posting https://example.com/jobs/dotnet-dev"
	if shouldNudgeResumeWrites(prompt, execs, reply) {
		t.Fatal("expected no nudge when agent asks about a missing skill")
	}
}

func TestShouldNotNudgeJobTrackerWhenAskingSkillGap(t *testing.T) {
	reply := "The posting requires .NET, do you have experience with it?"
	execs := []mcp.Execution{{Tool: "web_search"}, {Tool: "list_twin_entries"}}
	if shouldNudgeJobTracker("track this job", model.AssistantContextInput{View: model.AssistantViewJobTracker}, execs, reply) {
		t.Fatal("expected no job tracker nudge when asking about skill gap")
	}
}

func TestSanitizeAgentReplyKeepsSkillGapQuestion(t *testing.T) {
	reply := "This role needs .NET, do you have any experience I should add?"
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
