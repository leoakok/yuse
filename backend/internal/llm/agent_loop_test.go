package llm

import (
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func TestRoleTailorExactFailureScenarioNudges(t *testing.T) {
	prompt := "create a cv for forward deployed engineer role"
	execs := []mcp.Execution{{Tool: "create_resume"}}
	reply := "Created the CV shell for a Forward Deployed Engineer and set the title and layout. If you want, I can now tailor it with your real experience and skills."

	if !userAskedRoleTargetedCV(prompt) {
		t.Fatal("expected role-targeted intent")
	}
	if !shouldNudgeRoleTailorResearch(prompt, execs, reply) {
		t.Fatal("expected research nudge for create_resume-only shell")
	}
	if !looksLikeDeferredTailorOffer(reply) {
		t.Fatal("expected deferred tailor offer detection")
	}
	if !roleTailorNeedsPostToolNudge(prompt, execs) {
		t.Fatal("expected post-tool nudge after premature create_resume")
	}
	nudge, ok := nextAgentNudge(prompt, model.AssistantContextInput{View: model.AssistantViewResumes}, execs, reply, false)
	if !ok || nudge.text != roleTailorResearchNudge {
		t.Fatalf("expected research nudge action, got ok=%v text=%q", ok, nudge.text)
	}
}

func TestRoleTailorForceContinuationBlocksEarlyExit(t *testing.T) {
	prompt := "create a cv for forward deployed engineer role"
	execs := []mcp.Execution{{Tool: "create_resume"}, {Tool: "update_resume_settings"}}
	reply := "Created the CV shell for a Forward Deployed Engineer and set the title and layout."

	if !shouldForceRoleTailorContinuation(prompt, execs, reply) {
		t.Fatal("expected force continuation for incomplete role-tailor pipeline")
	}
}
