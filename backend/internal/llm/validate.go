package llm

import (
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

var writeTools = map[string]bool{
	"create_resume":               true,
	"update_resume":               true,
	"duplicate_resume":            true,
	"delete_resume":               true,
	"add_section_item":            true,
	"update_section_item":         true,
	"delete_section_item":         true,
	"set_item_visibility":         true,
	"reorder_resume_sections":     true,
	"set_section_visibility":      true,
	"update_section_display_title": true,
	"update_contact_profile":      true,
	"update_resume_settings":      true,
	"create_portfolio":            true,
	"update_portfolio":            true,
	"duplicate_portfolio":         true,
	"delete_portfolio":            true,
	"add_portfolio_project":       true,
	"update_portfolio_project":    true,
	"delete_portfolio_project":    true,
	"add_portfolio_skill":         true,
	"update_portfolio_skill":      true,
	"delete_portfolio_skill":      true,
	"add_portfolio_testimonial":   true,
	"update_portfolio_testimonial": true,
	"delete_portfolio_testimonial": true,
	"update_portfolio_contact_profile": true,
	"update_portfolio_settings":   true,
	"create_twin_entry":           true,
	"update_twin_entry":           true,
	"delete_twin_entry":           true,
	"create_tracked_job":          true,
	"update_tracked_job":          true,
	"delete_tracked_job":          true,
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
		"cv for ",
		"resume for ",
		"create a cv for",
		"create a resume for",
		"make a cv for",
		"make a resume for",
		"build a cv for",
		"build a resume for",
		"generate a cv for",
		"generate a resume for",
		"for this role",
		"for the role",
		"target role",
		"targeting a ",
		"targeting the ",
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

// userAskedRoleTargetedCV reports create/tailor requests aimed at a role title or
// type rather than a generic blank CV or import URL.
func userAskedRoleTargetedCV(text string) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	if userAskedWebsiteImport(text) || userAskedLinkedInImport(text) {
		return false
	}
	if strings.Contains(lower, "http://") || strings.Contains(lower, "https://") {
		return false
	}
	rolePhrases := []string{
		"cv for ",
		"resume for ",
		"create a cv for",
		"create a resume for",
		"make a cv for",
		"make a resume for",
		"build a cv for",
		"build a resume for",
		"generate a cv for",
		"generate a resume for",
		"for this role",
		"for the role",
		"target role",
		"targeting a ",
		"targeting the ",
	}
	for _, phrase := range rolePhrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	if strings.Contains(lower, " role") || strings.Contains(lower, " position") {
		createVerbs := []string{"create", "make", "build", "generate", "tailor", "cv", "resume"}
		for _, verb := range createVerbs {
			if strings.Contains(lower, verb) {
				return true
			}
		}
	}
	return false
}

func resumeShellWithoutSectionWrites(executions []mcp.Execution) bool {
	hasShell := false
	hasSectionWrite := false
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "create_resume", "duplicate_resume":
			hasShell = true
		case "add_section_item", "update_section_item":
			hasSectionWrite = true
		}
	}
	return hasShell && !hasSectionWrite
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
		"created the cv shell",
		"created a cv shell",
		"created the resume shell",
		"cv shell for",
		"resume shell for",
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

func looksLikeDeferredTailorOffer(reply string) bool {
	lower := strings.ToLower(strings.TrimSpace(reply))
	if lower == "" {
		return false
	}
	if strings.Contains(lower, "if you want") && strings.Contains(lower, "tailor") {
		return true
	}
	phrases := []string{
		"i can now tailor",
		"i can tailor it",
		"want me to tailor",
		"would you like me to tailor",
		"shall i tailor",
		"created the cv shell",
		"created a cv shell",
		"created the resume shell",
		"cv shell for",
		"resume shell for",
		"set the title and layout",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
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
			return fmt.Sprintf("Created %q, open it from Resumes.", resume.Title)
		}
		if m, ok := exec.Result.(map[string]any); ok {
			if title, ok := m["title"].(string); ok && title != "" {
				return fmt.Sprintf("Created %q, open it from Resumes.", title)
			}
		}
	}
	return "Created your tailored resume, open it from Resumes."
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

const (
	roleTailorMinSectionWrites = 3
	roleTailorMinWebSearches   = 1
	roleTailorMinResearchCalls = 2
)

func successfulToolCount(executions []mcp.Execution, tool string) int {
	n := 0
	for _, exec := range executions {
		if exec.Error == "" && exec.Tool == tool {
			n++
		}
	}
	return n
}

func roleTailorResearchDone(executions []mcp.Execution) bool {
	webSearches := successfulToolCount(executions, "web_search")
	if webSearches < roleTailorMinWebSearches {
		return false
	}
	researchCalls := webSearches + successfulToolCount(executions, "fetch_url")
	return researchCalls >= roleTailorMinResearchCalls
}

func roleTailorUserContextRead(executions []mcp.Execution) bool {
	hasTwin := successfulToolCount(executions, "list_twin_entries") > 0
	hasResumeRead := successfulToolCount(executions, "get_resume_content") > 0 ||
		successfulToolCount(executions, "list_resumes") > 0
	return hasTwin && hasResumeRead
}

func roleTailorSectionWriteCount(executions []mcp.Execution) int {
	return successfulToolCount(executions, "add_section_item") +
		successfulToolCount(executions, "update_section_item")
}

func roleTailorResumePopulated(executions []mcp.Execution) bool {
	hasResume := false
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		if exec.Tool == "create_resume" || exec.Tool == "duplicate_resume" {
			hasResume = true
			break
		}
	}
	return hasResume && roleTailorSectionWriteCount(executions) >= roleTailorMinSectionWrites
}

func roleTailorVerified(executions []mcp.Execution) bool {
	hasWrites := roleTailorSectionWriteCount(executions) > 0
	if !hasWrites {
		return false
	}
	for i := len(executions) - 1; i >= 0; i-- {
		exec := executions[i]
		if exec.Error != "" {
			continue
		}
		if exec.Tool == "get_resume_content" {
			for j := i - 1; j >= 0; j-- {
				prev := executions[j]
				if prev.Error != "" {
					continue
				}
				if prev.Tool == "add_section_item" || prev.Tool == "update_section_item" {
					return true
				}
				if prev.Tool == "create_resume" || prev.Tool == "duplicate_resume" {
					break
				}
			}
		}
	}
	return false
}

func roleTailorComplete(userText string, executions []mcp.Execution) bool {
	if !userAskedRoleTargetedCV(userText) {
		return true
	}
	return roleTailorResearchDone(executions) &&
		roleTailorUserContextRead(executions) &&
		roleTailorResumePopulated(executions) &&
		roleTailorVerified(executions)
}

func looksLikeThinRoleTailorReply(reply string) bool {
	trimmed := strings.TrimSpace(reply)
	if trimmed == "" {
		return true
	}
	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "done") && len(trimmed) < 40 {
		return true
	}
	if len(trimmed) < 100 {
		return true
	}
	hasFit := strings.Contains(lower, "fit") ||
		strings.Contains(lower, "gap") ||
		strings.Contains(lower, "partial") ||
		strings.Contains(lower, "strong")
	hasResearch := strings.Contains(lower, "research") ||
		strings.Contains(lower, "posting") ||
		strings.Contains(lower, "employer") ||
		strings.Contains(lower, "requirement")
	hasTailor := strings.Contains(lower, "tailor") ||
		strings.Contains(lower, "highlight") ||
		strings.Contains(lower, "emphasiz") ||
		strings.Contains(lower, "added") ||
		strings.Contains(lower, "updated")
	return !hasFit || !hasResearch || !hasTailor
}

func tailorWriteComplete(userText string, executions []mcp.Execution) bool {
	roleTarget := userAskedRoleTargetedCV(userText)
	if roleTarget {
		return roleTailorComplete(userText, executions)
	}
	if !userAskedCreateCV(userText) {
		return successfulWriteTool(executions)
	}
	hasResume := false
	hasSectionContent := false
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "create_resume", "duplicate_resume":
			hasResume = true
		case "add_section_item", "update_section_item":
			hasSectionContent = true
		}
	}
	return hasResume && hasSectionContent
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
	if isInteractiveClarification(reply) {
		return false
	}
	if userAskedCreateCV(userText) && resumeShellWithoutSectionWrites(executions) {
		if userAskedRoleTargetedCV(userText) {
			return false
		}
		return true
	}
	if successfulWriteTool(executions) {
		return false
	}
	if !userAskedCreateCV(userText) {
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

func shouldNudgeRoleTailorResearch(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	return !roleTailorResearchDone(executions)
}

func shouldNudgeRoleTailorUserContext(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if !roleTailorResearchDone(executions) {
		return false
	}
	return !roleTailorUserContextRead(executions)
}

func shouldNudgeRoleTailorCreate(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if !roleTailorResearchDone(executions) || !roleTailorUserContextRead(executions) {
		return false
	}
	for _, exec := range executions {
		if exec.Error == "" && (exec.Tool == "create_resume" || exec.Tool == "duplicate_resume") {
			return false
		}
	}
	return true
}

func shouldNudgeRoleTailorPopulate(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if !roleTailorResearchDone(executions) || !roleTailorUserContextRead(executions) {
		return false
	}
	if onlyResearchTools(executions) {
		return false
	}
	if resumeShellWithoutSectionWrites(executions) {
		return true
	}
	return looksLikeDeferredTailorOffer(reply)
}

func shouldNudgeRoleTailorIncomplete(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if resumeShellWithoutSectionWrites(executions) {
		return false
	}
	if roleTailorComplete(userText, executions) {
		return false
	}
	hasResume := false
	for _, exec := range executions {
		if exec.Error == "" && (exec.Tool == "create_resume" || exec.Tool == "duplicate_resume") {
			hasResume = true
			break
		}
	}
	return hasResume || roleTailorSectionWriteCount(executions) > 0 || onlyResearchTools(executions)
}

func shouldNudgeRoleTailorFinalReply(userText string, executions []mcp.Execution, reply string, recruiterDone bool) bool {
	if !userAskedRoleTargetedCV(userText) || !roleTailorComplete(userText, executions) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if !recruiterDone {
		return false
	}
	return looksLikeThinRoleTailorReply(reply)
}

const roleTailorResearchNudge = "Role-target CV requires mandatory web research before create or reply. Call web_search for \"[role] requirements skills responsibilities\" and at least one more web_search or fetch_url to read 2-3 real open job postings. Synthesize what employers want, then read Twin and existing CVs if you have not yet."

const roleTailorUserContextNudge = "Before tailoring, read the user's background: list_twin_entries, list_resumes, and get_resume_content on the best base CV. If GitHub is connected, search_github for repos matching role keywords."

const roleTailorCreateNudge = "You researched the role and read the user's background. Now duplicate_resume (preferred) or create_resume, then populate with tailored add_section_item calls before replying."

const roleTailorIncompleteNudge = "Role-target CV is not complete enough. Add at least 3 section writes: role-specific SUMMARY, multiple tailored EXPERIENCE or PROJECT items with achievement bullets, and SKILLS. Call get_resume_content and confirm visible content before replying. Your final reply must include fit assessment, what you researched, what you tailored, and any remaining gaps. Do not reply with only \"Done\"."

const roleTailorPopulateNudge = "Role-target CV is still empty or untailored. Do not reply yet. Add add_section_item for a role-specific SUMMARY and tailored EXPERIENCE/PROJECT/SKILLS items (add new items with different bullets when the same job needs role-specific wording; do not only use set_item_visibility). New add_section_item entries are visible in preview by default. You need at least 3 section writes. Call get_resume_content and confirm visible SUMMARY plus multiple experience or project bullets before confirming."

const roleTailorFinalReplyNudge = "Your final reply is too thin for a role-tailored CV. Include: (1) fit assessment (strong/partial/weak with reasons), (2) brief note on what you researched, (3) what you tailored and why, (4) any remaining gaps. Keep it concise but substantive."

// roleTailorNeedsPostToolNudge reports whether the agent should inject a pipeline
// nudge immediately after tool execution instead of waiting for a text-only reply.
func roleTailorNeedsPostToolNudge(userText string, executions []mcp.Execution) bool {
	if !userAskedRoleTargetedCV(userText) || roleTailorComplete(userText, executions) {
		return false
	}
	hasResumeShell := false
	for _, exec := range executions {
		if exec.Error == "" && (exec.Tool == "create_resume" || exec.Tool == "duplicate_resume") {
			hasResumeShell = true
			break
		}
	}
	if hasResumeShell && !roleTailorResearchDone(executions) {
		return true
	}
	if hasResumeShell && resumeShellWithoutSectionWrites(executions) {
		return true
	}
	if roleTailorSectionWriteCount(executions) > 0 && !roleTailorVerified(executions) {
		return true
	}
	return false
}

// shouldForceRoleTailorContinuation blocks early exit when the role-tailor pipeline
// is still incomplete and the model offered to continue later or replied too soon.
func shouldForceRoleTailorContinuation(userText string, executions []mcp.Execution, reply string) bool {
	if !userAskedRoleTargetedCV(userText) || roleTailorComplete(userText, executions) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	return true
}

type agentNudge struct {
	status string
	text   string
}

func nextAgentNudge(
	userText string,
	assistantContext model.AssistantContextInput,
	executions []mcp.Execution,
	reply string,
	recruiterDone bool,
) (agentNudge, bool) {
	switch {
	case shouldNudgeJobTracker(userText, assistantContext, executions, reply):
		return agentNudge{status: "Wrapping up your application…", text: jobTrackerNudge}, true
	case shouldNudgeRoleTailorResearch(userText, executions, reply):
		return agentNudge{status: "Researching the role…", text: roleTailorResearchNudge}, true
	case shouldNudgeRoleTailorUserContext(userText, executions, reply):
		return agentNudge{status: "Reviewing your background…", text: roleTailorUserContextNudge}, true
	case shouldNudgeRoleTailorCreate(userText, executions, reply):
		return agentNudge{status: "Creating your tailored resume…", text: roleTailorCreateNudge}, true
	case shouldNudgeRoleTailorPopulate(userText, executions, reply):
		return agentNudge{status: "Building your tailored resume…", text: roleTailorPopulateNudge}, true
	case shouldNudgeRoleTailorIncomplete(userText, executions, reply):
		return agentNudge{status: "Filling in tailored sections…", text: roleTailorIncompleteNudge}, true
	case shouldNudgeRoleTailorFinalReply(userText, executions, reply, recruiterDone):
		return agentNudge{status: "Finishing your summary…", text: roleTailorFinalReplyNudge}, true
	case shouldForceRoleTailorContinuation(userText, executions, reply):
		return agentNudge{status: "Finishing your tailored resume…", text: roleTailorIncompleteNudge}, true
	default:
		return agentNudge{}, false
	}
}

const resumeWriteNudge = "You researched but did not save a resume. Do not reply with CV text. Use attachment content and job research, then call create_resume, update_contact_profile, add_section_item (include SUMMARY), and set_item_visibility if trimming. Only send a brief confirmation after write tools succeed."

const resumePopulateNudge = "Resume shell may already exist, do not call create_resume again. Use the attached CV text and job research to update_contact_profile and add_section_item (SUMMARY plus experience/education/skills). Then reply briefly."

const thinStructuredFieldsNudge = "Recent section writes returned fieldHints, structured fields were missing or metadata was dumped in body. Re-read get_resume_content fieldGuide for each section type. For EXPERIENCE: headline=title, company, location, startDate, endDate; body=achievement bullets ONLY. Fix items with update_section_item before replying."

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
