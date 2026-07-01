package llm

import (
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// highImpactTools are write/import actions that should never fire on an ambiguous
// turn. The cheap classifier gates ambiguity before the agent runs; this map is a
// last-resort safety net inside the agent loop.
var highImpactTools = map[string]bool{
	"create_resume":          true,
	"duplicate_resume":       true,
	"delete_resume":          true,
	"create_portfolio":       true,
	"duplicate_portfolio":    true,
	"delete_portfolio":       true,
	"fetch_linkedin_profile": true,
	"explore_website":        true,
	"crawl_site":             true,
	"crawl_github_profile":   true,
	"delete_twin_entry":      true,
	"delete_section_item":  true,
	"delete_tracked_job":   true,
}

func userAskedLinkedInImport(text string) bool {
	lower := strings.ToLower(text)
	if strings.Contains(lower, "linkedin.com/in/") {
		return true
	}
	phrases := []string{
		"import from linkedin",
		"import linkedin",
		"from linkedin",
		"linkedin profile",
		"my linkedin",
		"pull from linkedin",
		"linkedin import",
	}
	for _, phrase := range phrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

// userAskedAccountInfo reports questions about the user's own documents (counts,
// lists) that the agent should answer with read tools like list_resumes.
func userAskedAccountInfo(text string) bool {
	lower := strings.ToLower(text)
	if !hasInScopeSignal(lower) {
		return false
	}
	accountPhrases := []string{
		"how many",
		"list my", "list all my", "show my", "show all my",
		"what are my", "which of my",
		"do i have any", "do i have a",
		"count my", "number of",
		"what cvs", "what resumes", "what portfolios",
	}
	for _, phrase := range accountPhrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

// userAskedCapabilities reports in-scope questions about what Yuse can do.
// Pure greetings ("hi") are handled separately; task requests ("help me tailor
// my resume") are not capabilities asks.
func userAskedCapabilities(text string) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	lower = strings.TrimRight(lower, "!?.")
	if lower == "help" || lower == "help me" {
		return true
	}
	capabilityPhrases := []string{
		"what can you do",
		"what do you do",
		"what can yuse do",
		"how can you help",
		"what are you able to do",
		"what are your capabilities",
		"what is yuse",
		"who are you",
		"tell me what you can do",
	}
	for _, phrase := range capabilityPhrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}

func userAskedDelete(text string) bool {
	lower := strings.ToLower(text)
	return strings.Contains(lower, "delete ") ||
		strings.Contains(lower, "remove my cv") ||
		strings.Contains(lower, "remove my resume") ||
		strings.Contains(lower, "remove that cv") ||
		strings.Contains(lower, "remove that resume")
}

func userExplicitlyRequestedHighImpactAction(text string) bool {
	return userAskedCreateCV(text) ||
		userAskedWebsiteImport(text) ||
		userAskedLinkedInImport(text) ||
		userAskedDelete(text)
}

// isContextualFollowUp reports short replies that refer to the assistant's prior
// turn ("rank them", "compare those") and should run the agent with history.
func isContextualFollowUp(userText string, history []*model.AssistantMessage) bool {
	if lastAssistantMessage(history) == "" {
		return false
	}
	lower := strings.ToLower(strings.TrimSpace(userText))
	if lower == "" {
		return false
	}
	if ok, _ := detectObviouslyOutOfScope(lower); ok {
		return false
	}
	if looksLikeNewQuestion(lower) {
		return false
	}
	words := strings.Fields(lower)

	followUpPhrases := []string{
		"them", "they", "those", "these", "both", "each",
		"rank", "compare", "sort", "order", "prioritize",
		"which one", "which is", "which are", "which was",
		"tell me more", "go on", "what about", "how about",
		"the first", "the second", "the other",
	}
	for _, phrase := range followUpPhrases {
		if strings.Contains(lower, phrase) {
			return true
		}
	}

	// Short imperative or reply after the assistant spoke (e.g. "rank them", "yes please").
	if len(words) <= 4 {
		return true
	}
	return false
}

// looksLikeNewQuestion reports standalone questions that should not inherit
// prior chat context as a follow-up (e.g. "how can I build a car").
func looksLikeNewQuestion(lower string) bool {
	starters := []string{
		"how ", "what ", "why ", "when ", "where ", "who ",
		"can i ", "could i ", "should i ", "would you ",
		"is there ", "are there ", "do you know ",
	}
	for _, s := range starters {
		if strings.HasPrefix(lower, s) {
			return true
		}
	}
	return false
}

// isWorkflowContinuation reports whether a short reply ("yes", "go ahead") is
// continuing a workflow the assistant proposed in its previous message.
func isWorkflowContinuation(userText string, history []*model.AssistantMessage) bool {
	lower := strings.ToLower(strings.TrimSpace(userText))
	if lower == "" {
		return false
	}
	continuations := []string{
		"yes", "yeah", "yep", "yup", "sure", "ok", "okay", "k",
		"go ahead", "do it", "please", "thanks", "thank you",
		"continue", "proceed", "sounds good", "that works", "perfect",
	}
	for _, phrase := range continuations {
		if lower == phrase {
			return true
		}
	}
	_ = history
	return false
}

// shouldBlockHighImpactTool is the in-loop safety net: block create/import/delete
// tools when the classifier deemed the turn ambiguous or out of scope.
func shouldBlockHighImpactTool(category model.AssistantCategory, toolName string) bool {
	if !highImpactTools[toolName] {
		return false
	}
	switch category {
	case model.AssistantCategoryUnclear,
		model.AssistantCategoryOutOfScope,
		model.AssistantCategoryChitchat:
		return true
	default:
		return false
	}
}
