package llm_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func setupRuleAgent(t *testing.T) (*llm.Service, *cv.Service) {
	t.Helper()
	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	llmSvc.SetTools(mcp.NewRegistry(cvSvc))
	return llmSvc, cvSvc
}

func resumeContext(resumeID string) model.AssistantContextInput {
	return model.AssistantContextInput{
		View:     model.AssistantViewResumeDetail,
		ResumeID: &resumeID,
	}
}

func TestRunAgentRequiresAPIKey(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)

	_, err := llmSvc.RunAgent(context.Background(), "add experience", resumeContext("resume-swe"), nil, nil, "", false, "", mcp.NewRegistry(cvSvc))
	if !errors.Is(err, llm.ErrMissingAPIKey) {
		t.Fatalf("expected ErrMissingAPIKey, got %v", err)
	}
}

func TestRuleAgentAddsExperience(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	resumeID := "resume-swe"

	turn, err := llm.RunRuleAgentForTest(llmSvc, "add experience at Contoso as lead engineer", resumeContext(resumeID), mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "add_section_item") {
		t.Fatalf("expected add_section_item execution, got %+v", turn.Executions)
	}

	content, err := cvSvc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	raw := experienceText(content)
	if !strings.Contains(strings.ToLower(raw), "contoso") {
		t.Fatalf("expected new experience in resume, got: %s", raw)
	}
}

func TestRuleAgentAddsSeniorEngineerAtGoogle(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	resumeID := "resume-swe"

	turn, err := llm.RunRuleAgentForTest(llmSvc, "Add a senior engineer role at Google to my resume", resumeContext(resumeID), mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "add_section_item") {
		t.Fatalf("expected add_section_item, got %+v", turn.Executions)
	}

	content, err := cvSvc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	raw := strings.ToLower(experienceText(content))
	if !strings.Contains(raw, "google") {
		t.Fatalf("expected Google in resume, got: %s", raw)
	}
}

func TestRuleAgentHidesBrightLabs(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	resumeID := "resume-swe"

	turn, err := llm.RunRuleAgentForTest(llmSvc, "Hide the Bright Labs job from my CV", resumeContext(resumeID), mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "set_item_visibility") {
		t.Fatalf("expected set_item_visibility, got %+v", turn.Executions)
	}

	content, err := cvSvc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	for _, swi := range content.Sections {
		if swi.Section.Type != model.SectionTypeExperience {
			continue
		}
		for _, item := range swi.Items {
			company, _ := item.Metadata["company"].(string)
			if strings.Contains(strings.ToLower(item.Headline+" "+company), "bright labs") && item.ShowInPreview {
				t.Fatal("expected Bright Labs to be hidden from preview")
			}
		}
	}
}

func TestRuleAgentUpdatesProfileName(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	resumeID := "resume-swe"

	turn, err := llm.RunRuleAgentForTest(llmSvc, "Update my profile name to Jane Doe", resumeContext(resumeID), mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "update_contact_profile") {
		t.Fatalf("expected update_contact_profile, got %+v", turn.Executions)
	}
	for _, exec := range turn.Executions {
		if exec.Tool != "update_contact_profile" || exec.Error != "" {
			continue
		}
		fullName, _ := exec.Arguments["fullName"].(string)
		if fullName != "Jane Doe" {
			t.Fatalf("expected fullName Jane Doe, got %q", fullName)
		}
	}

	content, err := cvSvc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if content.ContactProfile.FullName != "Jane Doe" {
		t.Fatalf("expected fullName Jane Doe, got %q", content.ContactProfile.FullName)
	}
}

func TestRuleAgentUpdatesNamedResumeLocation(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	openResumeID := "resume-swe"
	elon := cvSvc.CreateResume("Elon Musk")

	turn, err := llm.RunRuleAgentForTest(
		llmSvc,
		"update elon musks resume, he lives in mars from now on",
		resumeContext(openResumeID),
		mcp.NewRegistry(cvSvc),
	)
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "update_contact_profile") {
		t.Fatalf("expected update_contact_profile, got %+v", turn.Executions)
	}
	for _, exec := range turn.Executions {
		if exec.Tool != "update_contact_profile" || exec.Error != "" {
			continue
		}
		resumeID, _ := exec.Arguments["resumeId"].(string)
		if resumeID != elon.ID {
			t.Fatalf("expected resumeId %q (Elon Musk), got %q", elon.ID, resumeID)
		}
		loc, _ := exec.Arguments["location"].(string)
		if !strings.Contains(strings.ToLower(loc), "mars") {
			t.Fatalf("expected location Mars, got %q", loc)
		}
	}

	elonContent, err := cvSvc.GetResumeWithContent(elon.ID)
	if err != nil {
		t.Fatalf("GetResumeWithContent elon: %v", err)
	}
	if elonContent.ContactProfile.Location == nil || !strings.Contains(strings.ToLower(*elonContent.ContactProfile.Location), "mars") {
		t.Fatalf("expected Elon location Mars, got %+v", elonContent.ContactProfile.Location)
	}

	sweContent, err := cvSvc.GetResumeWithContent(openResumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent swe: %v", err)
	}
	if sweContent.ContactProfile.Location != nil && strings.Contains(strings.ToLower(*sweContent.ContactProfile.Location), "mars") {
		t.Fatal("open resume should not have been updated")
	}
}

func TestRuleAgentUpdatesEmail(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)
	resumeID := "resume-swe"

	turn, err := llm.RunRuleAgentForTest(llmSvc, "Update my email to alex.new@example.com", resumeContext(resumeID), mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "update_contact_profile") {
		t.Fatalf("expected update_contact_profile, got %+v", turn.Executions)
	}

	content, err := cvSvc.GetResumeWithContent(resumeID)
	if err != nil {
		t.Fatalf("GetResumeWithContent: %v", err)
	}
	if content.ContactProfile.Email == nil || *content.ContactProfile.Email != "alex.new@example.com" {
		t.Fatalf("expected updated email, got %+v", content.ContactProfile.Email)
	}
}

func TestRuleAgentCreatesTwinEntry(t *testing.T) {
	llmSvc, cvSvc := setupRuleAgent(t)

	turn, err := llm.RunRuleAgentForTest(llmSvc, "Add to my twin: I led a team of 10 at Contoso", model.AssistantContextInput{
		View: model.AssistantViewResumeDetail,
	}, mcp.NewRegistry(cvSvc))
	if err != nil {
		t.Fatalf("RunRuleAgentForTest: %v", err)
	}
	if !hasTool(turn.Executions, "create_twin_entry") {
		t.Fatalf("expected create_twin_entry, got %+v", turn.Executions)
	}

	entries := cvSvc.ListTwinEntries()
	found := false
	for _, entry := range entries {
		if strings.Contains(strings.ToLower(entry.Body), "team of 10") {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected new twin entry with team of 10")
	}
}

func hasTool(executions []mcp.Execution, name string) bool {
	for _, exec := range executions {
		if exec.Tool == name && exec.Error == "" {
			return true
		}
	}
	return false
}

func experienceText(content *model.ResumeWithContent) string {
	var raw strings.Builder
	for _, swi := range content.Sections {
		if swi.Section.Type != model.SectionTypeExperience {
			continue
		}
		for _, item := range swi.Items {
			raw.WriteString(item.Headline)
			raw.WriteString(item.Body)
		}
	}
	return raw.String()
}
