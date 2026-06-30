package llm

import (
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

var writeTools = map[string]bool{
	"create_resume":          true,
	"update_resume":          true,
	"duplicate_resume":       true,
	"delete_resume":          true,
	"add_section_item":       true,
	"update_section_item":    true,
	"set_item_visibility":    true,
	"update_contact_profile": true,
	"update_resume_settings": true,
	"create_twin_entry":      true,
	"update_twin_entry":      true,
	"delete_twin_entry":      true,
	"update_tracked_job":     true,
}

func successfulWriteTool(executions []mcp.Execution) bool {
	for _, exec := range executions {
		if writeTools[exec.Tool] && exec.Error == "" {
			return true
		}
	}
	return false
}

func onlyResearchTools(executions []mcp.Execution) bool {
	hasResearch := false
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		if exec.Tool == "web_search" || exec.Tool == "fetch_url" || exec.Tool == "fetch_linkedin_profile" || exec.Tool == "crawl_site" || exec.Tool == "crawl_github_profile" || exec.Tool == "explore_website" {
			hasResearch = true
		}
	}
	return hasResearch && !successfulWriteTool(executions)
}

func userAskedCreateCV(text string) bool {
	lower := strings.ToLower(text)
	phrases := []string{
		"create a cv",
		"create a resume",
		"create cv",
		"create resume",
		"build a cv",
		"build a resume",
		"make a cv",
		"make a resume",
		"generate a cv",
		"generate a resume",
		"proper version",
		"tailored version",
		"tailor for",
		"tailor to",
		"tailor this",
		"tailor my",
		"check this cv",
		"check my cv",
		"review this cv",
		"review my cv",
		"for this job",
		"job listing",
		"job posting",
		"linkedin.com/jobs",
		"jobs/view/",
		"track this job",
		"added this job",
		"link them to this application",
		"cover letter",
		"from site",
		"from website",
		"from web",
		"from his site",
		"from her site",
		"from their site",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func looksLikePersistenceClaim(reply string) bool {
	lower := strings.ToLower(reply)
	phrases := []string{
		"i've created",
		"i have created",
		"i created",
		"i've added",
		"i have added",
		"i added",
		"i've updated",
		"i have updated",
		"i updated",
		"i've saved",
		"i have saved",
		"i saved",
		"i've built",
		"i have built",
		"i built",
		"created a cv",
		"created a resume",
		"created your",
		"resume is ready",
		"cv is ready",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func looksLikeDeferredCreateOffer(reply string) bool {
	lower := strings.ToLower(reply)
	return strings.Contains(lower, "would you like me to create") ||
		strings.Contains(lower, "shall i create") ||
		strings.Contains(lower, "want me to create") ||
		strings.Contains(lower, "i will create") ||
		strings.Contains(lower, "i'll create") ||
		strings.Contains(lower, "let me create")
}

func looksLikeSectionListingOffer(reply string) bool {
	lower := strings.ToLower(reply)
	phrases := []string{
		"here are the key sections",
		"key sections for",
		"here is a cv",
		"here's a cv",
		"here is your cv",
		"here's your cv",
		"here is the cv",
		"here's the resume",
		"below is a cv",
		"draft cv",
		"cv draft",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func looksLikeMarkdownCVDump(reply string) bool {
	lower := strings.ToLower(reply)
	headerMarkers := 0
	for _, phrase := range []string{
		"### contact",
		"## contact",
		"### summary",
		"## summary",
		"### experience",
		"## experience",
		"### education",
		"## education",
		"### skills",
		"## skills",
	} {
		if strings.Contains(lower, phrase) {
			headerMarkers++
		}
	}
	if headerMarkers >= 2 {
		return true
	}
	placeholderMarkers := 0
	for _, phrase := range []string{
		"[your email",
		"your.email@",
		"email@example",
		"@example.com",
		"phone number]",
		"[phone",
		"placeholder",
	} {
		if strings.Contains(lower, phrase) {
			placeholderMarkers++
		}
	}
	return headerMarkers >= 1 && placeholderMarkers >= 1
}

func looksLikeTextOnlyCVDraft(reply string) bool {
	if looksLikeMarkdownCVDump(reply) {
		return true
	}
	lower := strings.ToLower(reply)
	markers := 0
	for _, phrase := range []string{
		"work experience",
		"professional summary",
		"education",
		"## ",
		"### ",
		"**",
		"• ",
		"- ceo",
		"- founder",
	} {
		if strings.Contains(lower, phrase) {
			markers++
		}
	}
	return markers >= 3 && len(reply) > 400
}

func looksLikeVerboseTailorSummary(reply string) bool {
	lower := strings.ToLower(reply)
	if !strings.Contains(lower, "key updates") &&
		!strings.Contains(lower, "here are the") &&
		!strings.Contains(lower, "tailored your cv") {
		return false
	}
	bulletCount := strings.Count(reply, "\n- ") + strings.Count(reply, "\n• ")
	return bulletCount >= 2 || strings.Count(reply, "**") >= 4
}

func briefWriteConfirmation(executions []mcp.Execution) string {
	for i := len(executions) - 1; i >= 0; i-- {
		exec := executions[i]
		if exec.Tool != "create_resume" || exec.Error != "" {
			continue
		}
		if resume, ok := exec.Result.(*model.Resume); ok && resume != nil && resume.Title != "" {
			return fmt.Sprintf("Created %q — open it from Resumes.", resume.Title)
		}
		if m, ok := exec.Result.(map[string]any); ok {
			if title, ok := m["title"].(string); ok && title != "" {
				return fmt.Sprintf("Created %q — open it from Resumes.", title)
			}
		}
	}
	return "Created your tailored resume — open it from Resumes."
}

func userAskedJobTracker(text string, assistantContext model.AssistantContextInput) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	if strings.Contains(lower, "link them to this application") ||
		strings.Contains(lower, "track this job") ||
		strings.Contains(lower, "added this job") ||
		strings.Contains(lower, "cover letter") {
		return true
	}
	if assistantContext.View == model.AssistantViewJobTracker && assistantContext.JobID != nil {
		return userAskedCreateCV(text) || strings.Contains(lower, "http")
	}
	return false
}

func jobTrackerWriteComplete(userText string, assistantContext model.AssistantContextInput, executions []mcp.Execution) bool {
	if !userAskedJobTracker(userText, assistantContext) {
		return false
	}
	hasResume := false
	hasCoverLetter := false
	for _, exec := range executions {
		if exec.Error != "" || exec.Tool != "update_tracked_job" {
			continue
		}
		if job, ok := exec.Result.(*model.TrackedJob); ok && job != nil {
			if job.ResumeID != nil && *job.ResumeID != "" {
				hasResume = true
			}
			if strings.TrimSpace(job.CoverLetter) != "" {
				hasCoverLetter = true
			}
		}
	}
	return hasResume && hasCoverLetter
}

func tailorWriteComplete(userText string, executions []mcp.Execution) bool {
	if !userAskedCreateCV(userText) {
		return successfulWriteTool(executions)
	}
	hasResume := false
	hasContent := false
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "create_resume", "duplicate_resume":
			hasResume = true
		case "add_section_item", "update_section_item", "update_contact_profile":
			hasContent = true
		}
	}
	return hasResume && hasContent
}

const jobTrackerNudge = "Job Tracker workflow incomplete. Finish tailoring: create or duplicate a resume, populate it, write a cover letter, then call update_tracked_job with resumeId and coverLetter for the job id in context. Do not reply until update_tracked_job succeeds."

func looksLikeSkillGapQuestion(reply string) bool {
	lower := strings.ToLower(reply)
	if !strings.Contains(reply, "?") {
		return false
	}
	phrases := []string{
		"do you have",
		"have you worked with",
		"have you used",
		"any experience with",
		"experience with",
		"should i highlight",
		"should i add",
		"should i include",
		"want me to add",
		"want me to include",
		"do you know",
		"missing from",
		"not in your",
		"not on your",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func looksLikeSTARFollowUp(reply string) bool {
	lower := strings.ToLower(reply)
	if !strings.Contains(reply, "?") {
		return false
	}
	phrases := []string{
		"what changed",
		"what was the",
		"what did you",
		"how did that",
		"what problem",
		"what was your role",
		"what were you trying",
		"what was the outcome",
		"what was the result",
		"can you tell me more",
		"tell me more about",
		"what specifically",
		"what impact",
		"what happened",
		"missing",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func isInteractiveClarification(reply string) bool {
	trimmed := strings.TrimSpace(reply)
	if trimmed == "" {
		return false
	}
	if looksLikeSkillGapQuestion(trimmed) {
		return true
	}
	if looksLikeSTARFollowUp(trimmed) {
		return true
	}
	if !strings.HasSuffix(trimmed, "?") {
		return false
	}
	if looksLikePersistenceClaim(trimmed) || looksLikeDeferredCreateOffer(trimmed) {
		return false
	}
	return len(trimmed) <= 280
}

func shouldNudgeResumeWrites(userText string, executions []mcp.Execution, reply string) bool {
	if successfulWriteTool(executions) {
		return false
	}
	if !userAskedCreateCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if onlyResearchTools(executions) {
		return true
	}
	return looksLikePersistenceClaim(reply) ||
		looksLikeDeferredCreateOffer(reply) ||
		looksLikeSectionListingOffer(reply) ||
		looksLikeTextOnlyCVDraft(reply)
}

const resumeWriteNudge = "You researched but did not save a resume. Do not reply with CV text. Use attachment content and job research, then call create_resume, update_contact_profile, add_section_item (include SUMMARY), and set_item_visibility if tailoring. Only send a brief confirmation after write tools succeed."

const resumePopulateNudge = "Resume shell may already exist — do not call create_resume again. Use the attached CV text and job research to update_contact_profile and add_section_item (SUMMARY plus experience/education/skills). Then reply briefly."

const thinStructuredFieldsNudge = "Recent section writes returned fieldHints — structured fields were missing or metadata was dumped in body. Re-read get_resume_content fieldGuide for each section type. For EXPERIENCE: headline=title, company, location, startDate, endDate; body=achievement bullets ONLY. Fix items with update_section_item before replying."

func fieldHintsFromResult(result any) []string {
	m, ok := result.(map[string]any)
	if !ok {
		return nil
	}
	raw, ok := m["fieldHints"]
	if !ok {
		return nil
	}
	switch hints := raw.(type) {
	case []string:
		return hints
	case []any:
		out := make([]string, 0, len(hints))
		for _, h := range hints {
			if s, ok := h.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func shouldNudgeThinStructuredFields(executions []mcp.Execution, reply string) bool {
	if isInteractiveClarification(reply) {
		return false
	}
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "add_section_item", "update_section_item", "create_twin_entry", "update_twin_entry":
			if len(fieldHintsFromResult(exec.Result)) > 0 {
				return true
			}
		}
	}
	return false
}

func structuredFieldsNudgeMessage(executions []mcp.Execution) string {
	var hints []string
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		hints = append(hints, fieldHintsFromResult(exec.Result)...)
	}
	if len(hints) == 0 {
		return thinStructuredFieldsNudge
	}
	return thinStructuredFieldsNudge + " Hints: " + strings.Join(dedupeHintStrings(hints), "; ")
}

func dedupeHintStrings(items []string) []string {
	seen := make(map[string]bool, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}

// SanitizeAgentReply replaces assistant claims that no write tool succeeded.
func SanitizeAgentReply(reply string, executions []mcp.Execution) string {
	trimmed := strings.TrimSpace(reply)
	if trimmed == "" {
		return trimmed
	}
	if isInteractiveClarification(trimmed) {
		return trimmed
	}
	if successfulWriteTool(executions) {
		if looksLikeVerboseTailorSummary(trimmed) {
			return briefWriteConfirmation(executions)
		}
		return trimmed
	}
	if looksLikePersistenceClaim(trimmed) {
		return "I didn't save that to your workspace yet. Send the request again and I'll create the resume with tools."
	}
	if looksLikeDeferredCreateOffer(trimmed) ||
		looksLikeSectionListingOffer(trimmed) ||
		looksLikeTextOnlyCVDraft(trimmed) {
		return "I drafted that in chat but didn't save a resume. Ask again and I'll search (if needed) and create it in your workspace."
	}
	if onlyResearchTools(executions) && len(trimmed) > 80 {
		return "I looked online but didn't create a resume yet. Ask again and I'll save it to your workspace with the resume tools."
	}
	return trimmed
}
