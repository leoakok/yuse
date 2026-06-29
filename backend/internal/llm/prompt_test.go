package llm

import (
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestSystemPromptNamedResumeTargeting(t *testing.T) {
	resumeID := "resume-swe"
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{
		View:     model.AssistantViewResumeDetail,
		ResumeID: &resumeID,
	}, "", false, "")

	for _, phrase := range []string{
		"list_resumes first",
		"match by title",
		"without naming another",
		"update_contact_profile",
	} {
		if !strings.Contains(prompt, phrase) {
			t.Fatalf("expected prompt to contain %q", phrase)
		}
	}
	if strings.Contains(prompt, "Default resumeId for tools") {
		t.Fatal("prompt should not tell agent to blindly default to UI resumeId")
	}
}

func TestSystemPromptContainsSkillGapProtocol(t *testing.T) {
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{
		View: model.AssistantViewJobTracker,
	}, "", false, "")

	for _, phrase := range []string{
		"Skill gap protocol",
		"ask ONE",
		"create_twin_entry",
		"Never invent skills",
		"list_twin_entries",
	} {
		if !strings.Contains(prompt, phrase) {
			t.Fatalf("expected prompt to contain %q", phrase)
		}
	}
}

func TestSystemPromptContainsVoiceAndSTAR(t *testing.T) {
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{
		View: model.AssistantViewDigitalTwin,
	}, "", false, "")

	for _, phrase := range []string{
		"Who you are",
		"CV journey",
		"HR",
		"Plain language",
		"STAR-aware",
		"Ask, don't guess",
		"Search when useful",
		"Voice",
		"STAR",
		"PAR",
		"non-negotiable",
		"one question at a time",
		"I'd be happy to",
		"create_twin_entry",
		"full STAR",
	} {
		if !strings.Contains(prompt, phrase) {
			t.Fatalf("expected prompt to contain %q", phrase)
		}
	}
}

func TestFormatTwinContextShowsMissing(t *testing.T) {
	ctx := FormatTwinContext([]*model.TwinEntry{{
		Type:  model.TwinEntryTypeExperience,
		Title: "Backend lead",
		Metadata: map[string]any{
			"company": "Acme",
			"action":  "Built API",
		},
	}})
	if !strings.Contains(ctx, "missing:") {
		t.Fatalf("expected missing elements in twin context, got %q", ctx)
	}
}

func TestSystemPromptGitHubConnectedMentionsAuthenticatedImport(t *testing.T) {
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{
		View: model.AssistantViewDigitalTwin,
	}, "", true, "leoakok")

	for _, phrase := range []string{
		"Connected as @leoakok",
		"search_github",
		"listUserRepos",
		"authenticatedAs",
		"NEVER import",
	} {
		if !strings.Contains(prompt, phrase) {
			t.Fatalf("expected prompt to contain %q", phrase)
		}
	}
}

func TestSystemPromptJobTrackerMentionsGapCompare(t *testing.T) {
	jobID := "job-dotnet"
	prompt := buildAgentSystemPrompt(model.AssistantContextInput{
		View:  model.AssistantViewJobTracker,
		JobID: &jobID,
	}, "", false, "")

	if !strings.Contains(prompt, "compare skills") {
		t.Fatal("expected job tracker context to mention comparing skills")
	}
	if !strings.Contains(prompt, "skill-gap answer") {
		t.Fatal("expected job tracker context to allow skill-gap questions")
	}
}
