package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	openai "github.com/sashabaranov/go-openai"
)

// Classification is the output of the cheap intent layer that runs before the
// main agent. It is one small structured-output call (or a deterministic
// fast-path / heuristic), never a second full agent loop.
type Classification struct {
	Category   model.AssistantCategory
	Confidence float64
	Tags       []string
	Params     map[string]string
	Reason     string
	// Source: "fast-path", "classifier", or "fallback".
	Source string
}

// minClassifierConfidence: below this the request is treated as UNCLEAR so the
// agent asks one clarifying question instead of guessing.
const minClassifierConfidence = 0.45

// IsScopeHandled reports whether a category is answered before the main agent
// (out of scope or chit-chat) for near-zero cost. UNCLEAR messages are routed
// to the main agent so follow-ups like "rank them" can use conversation context.
func IsScopeHandled(category model.AssistantCategory) bool {
	return isScopeHandled(category)
}

// actionableCategories run the main agent (with injected dictionary guidance).
// OUT_OF_SCOPE and CHITCHAT are handled before the agent; UNCLEAR is not.
func isScopeHandled(category model.AssistantCategory) bool {
	switch category {
	case model.AssistantCategoryOutOfScope,
		model.AssistantCategoryChitchat:
		return true
	default:
		return false
	}
}

// Classify runs the layered cascade: deterministic fast-path -> cheap LLM
// classifier (structured output) -> heuristic fallback when no key/parse fails.
func (s *Service) Classify(
	ctx context.Context,
	userText string,
	assistantContext model.AssistantContextInput,
	history []*model.AssistantMessage,
) Classification {
	trimmed := strings.TrimSpace(userText)
	if trimmed == "" {
		return Classification{Category: model.AssistantCategoryUnclear, Confidence: 1, Source: "fast-path", Reason: "empty message"}
	}

	// Layer 1, deterministic fast-paths (zero cost).
	if class, ok := fastPathClassify(trimmed); ok {
		return class
	}
	if class, ok := fastPathContextualFollowUp(trimmed, history); ok {
		return class
	}

	// Layer 2, cheap LLM classifier with structured output.
	if s.hasAPIKey && s.client != nil {
		if class, err := s.llmClassify(ctx, trimmed, assistantContext, history); err == nil {
			return applyConfidenceFloor(class)
		}
	}

	// Layer 3, heuristic fallback (offline / parse failure).
	return heuristicClassify(trimmed, assistantContext, history)
}

func applyConfidenceFloor(class Classification) Classification {
	if class.Category == model.AssistantCategoryOutOfScope {
		return class
	}
	if class.Confidence < minClassifierConfidence {
		class.Category = model.AssistantCategoryUnclear
		if class.Reason == "" {
			class.Reason = "low confidence"
		}
	}
	return class
}

var greetingTokens = map[string]bool{
	"hi": true, "hii": true, "hey": true, "heya": true, "hello": true,
	"yo": true, "sup": true, "hiya": true, "howdy": true, "gm": true,
	"good morning": true, "good afternoon": true, "good evening": true,
}

// outOfScopeTopics maps obvious out-of-scope keywords to a human topic for ScopeReply.
var outOfScopeTopics = []struct {
	keyword string
	topic   string
}{
	{"buy", "buying things"},
	{"purchase", "shopping"},
	{"order a", "shopping"},
	{"weather", "the weather"},
	{"recipe", "recipes"},
	{"cook ", "cooking"},
	{"stock price", "stock prices"},
	{"invest in", "investing"},
	{"tell me a joke", "jokes"},
	{"translate ", "translation"},
	{"write a song", "songwriting"},
	{"movie recommend", "movie recommendations"},
	{"video game", "video games"},
	{"legal advice", "legal advice"},
	{"medical advice", "medical advice"},
	{"diagnose", "medical advice"},
	{"financial advice", "financial advice"},
	{"tax advice", "tax advice"},
	{"write a python", "general coding"},
	{"debug this code", "general coding"},
	{"fix this bug", "general coding"},
	{"leetcode", "general coding"},
}

// nonCareerHowToPrefixes catch obvious DIY/how-to asks unrelated to CV work.
var nonCareerHowToPrefixes = []string{
	"how to build", "how can i build", "how do i build",
	"how to make", "how can i make", "how do i make",
	"how to cook", "how can i cook", "how do i cook",
	"how to fix", "how can i fix", "how do i fix",
	"how to repair", "how can i repair", "how do i repair",
}

// detectObviouslyOutOfScope reports non-career asks with no in-scope signal.
// Used by fast-path, heuristic fallback, and the agent-loop safety guard.
func detectObviouslyOutOfScope(lower string) (bool, string) {
	if hasInScopeSignal(lower) {
		return false, ""
	}
	for _, prefix := range nonCareerHowToPrefixes {
		if strings.Contains(lower, prefix) {
			return true, "that"
		}
	}
	for _, oos := range outOfScopeTopics {
		if strings.Contains(lower, oos.keyword) {
			return true, oos.topic
		}
	}
	return false, ""
}

func fastPathClassify(trimmed string) (Classification, bool) {
	lower := strings.ToLower(trimmed)

	if greetingTokens[lower] {
		return Classification{Category: model.AssistantCategoryChitchat, Confidence: 0.95, Source: "fast-path", Reason: "greeting"}, true
	}

	if class, ok := fastPathActionableInfo(trimmed); ok {
		return class, true
	}

	if class, ok := obviousOutOfScopeClassification(lower, "fast-path"); ok {
		return class, true
	}
	return Classification{}, false
}

func obviousOutOfScopeClassification(lower, source string) (Classification, bool) {
	if ok, topic := detectObviouslyOutOfScope(lower); ok {
		conf := 0.9
		if source == "fallback" {
			conf = 0.85
		}
		return Classification{
			Category:   model.AssistantCategoryOutOfScope,
			Confidence: conf,
			Source:     source,
			Reason:     "obvious out-of-scope",
			Params:     map[string]string{"topic": topic},
		}, true
	}
	return Classification{}, false
}

func fastPathActionableInfo(trimmed string) (Classification, bool) {
	if userAskedAccountInfo(trimmed) {
		return Classification{
			Category:   model.AssistantCategoryAdvice,
			Confidence: 0.92,
			Source:     "fast-path",
			Tags:       []string{"account-info", "advice"},
			Reason:     "account/document info question",
		}, true
	}
	if userAskedCapabilities(trimmed) {
		return Classification{
			Category:   model.AssistantCategoryAdvice,
			Confidence: 0.92,
			Source:     "fast-path",
			Tags:       []string{"capabilities", "advice"},
			Reason:     "capabilities/help question",
		}, true
	}
	return Classification{}, false
}

func fastPathContextualFollowUp(trimmed string, history []*model.AssistantMessage) (Classification, bool) {
	if !isContextualFollowUp(trimmed, history) {
		return Classification{}, false
	}
	return Classification{
		Category:   model.AssistantCategoryAdvice,
		Confidence: 0.88,
		Source:     "fast-path",
		Tags:       []string{"advice", "account-info"},
		Reason:     "contextual follow-up to prior assistant message",
	}, true
}

func hasInScopeSignal(lower string) bool {
	signals := []string{
		"cv", "resume", "résumé", "portfolio", "cover letter", "job", "application",
		"experience", "skill", "career", "linkedin", "github", "section", "twin", "http",
	}
	for _, s := range signals {
		if strings.Contains(lower, s) {
			return true
		}
	}
	return false
}

// heuristicClassify is the offline/fallback classifier built on the existing
// keyword helpers. It keeps behaviour sane without an API key (and in tests).
func heuristicClassify(trimmed string, assistantContext model.AssistantContextInput, history []*model.AssistantMessage) Classification {
	lower := strings.ToLower(trimmed)
	words := strings.Fields(lower)

	if class, ok := obviousOutOfScopeClassification(lower, "fallback"); ok {
		return class
	}

	switch {
	case userAskedAccountInfo(trimmed):
		return Classification{Category: model.AssistantCategoryAdvice, Confidence: 0.85, Source: "fallback", Tags: []string{"account-info", "advice"}, Reason: "account/document info question"}
	case userAskedCapabilities(trimmed):
		return Classification{Category: model.AssistantCategoryAdvice, Confidence: 0.85, Source: "fallback", Tags: []string{"capabilities", "advice"}, Reason: "capabilities/help question"}
	case userAskedJobTracker(trimmed, assistantContext):
		return Classification{Category: model.AssistantCategoryJobApplication, Confidence: 0.7, Source: "fallback", Tags: []string{"job-application", "cover-letter"}, Reason: "job/tailoring keywords"}
	case userAskedRoleTargetedCV(trimmed):
		return Classification{Category: model.AssistantCategoryJobApplication, Confidence: 0.78, Source: "fallback", Tags: []string{"role-tailor", "job-application", "cv-best-practices", "skill-gap"}, Reason: "role-targeted create/tailor"}
	case userAskedWebsiteImport(trimmed) || userAskedLinkedInImport(trimmed) || userAskedCreateCV(trimmed):
		return Classification{Category: model.AssistantCategoryCreateCv, Confidence: 0.7, Source: "fallback", Tags: []string{"cv-best-practices"}, Reason: "create/import keywords"}
	}

	if assistantContext.View == model.AssistantViewPortfolioDetail || assistantContext.View == model.AssistantViewPortfolios || strings.Contains(lower, "portfolio") {
		return Classification{Category: model.AssistantCategoryPortfolio, Confidence: 0.6, Source: "fallback", Tags: []string{"portfolio"}, Reason: "portfolio context"}
	}

	// Very short, no actionable signal -> unclear (agent will handle with context).
	if len(words) <= 2 && len(trimmed) < 12 {
		if isContextualFollowUp(trimmed, history) {
			return Classification{Category: model.AssistantCategoryAdvice, Confidence: 0.7, Source: "fallback", Tags: []string{"advice"}, Reason: "contextual follow-up"}
		}
		return Classification{Category: model.AssistantCategoryUnclear, Confidence: 0.6, Source: "fallback", Reason: "too short to act on"}
	}

	// No in-scope signal and no career context: prefer UNCLEAR over guessing ADVICE.
	if !hasInScopeSignal(lower) && assistantContext.View != model.AssistantViewResumeDetail {
		return Classification{Category: model.AssistantCategoryUnclear, Confidence: 0.55, Source: "fallback", Reason: "no in-scope signal"}
	}

	// Default: treat as a CV edit/advice request the agent can act on.
	if assistantContext.View == model.AssistantViewResumeDetail {
		return Classification{Category: model.AssistantCategoryUpdateCv, Confidence: 0.55, Source: "fallback", Tags: []string{"cv-best-practices", "star"}, Reason: "resume context"}
	}
	return Classification{Category: model.AssistantCategoryAdvice, Confidence: 0.5, Source: "fallback", Tags: []string{"advice", "cv-best-practices"}, Reason: "default advice"}
}

const classifierSystemPrompt = `You are the intent router for Yuse, an assistant that ONLY helps with CVs/resumes, portfolios, job applications, and career/CV advice.

Classify the user's latest message into exactly one category:
- UPDATE_CV: edit/improve an existing CV (add/fix experience, skills, summary, formatting on a resume).
- CREATE_CV: make a new CV/resume, including from a LinkedIn/website/GitHub import or for a public figure. Also "create/build a CV for [role title]" when the focus is building a new document (still run role research and fit assessment).
- PORTFOLIO: anything about a portfolio site (projects/case studies, hero, skills, testimonials).
- JOB_APPLICATION: tailor to a specific job or role type, cover letters, tracking an application, skill-gap for a posting, or "create a CV for [role]" when tailoring to a target role (tags: role-tailor, job-application).
- ADVICE: general CV/career questions AND in-scope informational asks: how many/list/show the user's CVs/resumes/portfolios, what Yuse can do, or "help" asking for capabilities (tags: account-info, capabilities, advice). The main agent will use tools to answer these, do NOT treat them as chit-chat.
- OUT_OF_SCOPE: requests unrelated to CVs/portfolios/jobs/career (shopping, weather, coding help, trivia, legal/medical/financial advice, etc.).
- CHITCHAT: ONLY pure greetings or thanks with no question ("hi", "thanks"), not "help", not "what can you do", not questions about the user's documents.
- UNCLEAR: too short or vague when there is NO prior assistant message to anchor it (e.g. lone "ad", "hm"), not real in-scope questions.

Routing rules:
- "how many CVs/resumes do I have", "list my resumes", etc. → ADVICE (account-info), NOT CHITCHAT/UNCLEAR/OUT_OF_SCOPE.
- Follow-ups to your previous reply ("rank them", "compare those", "which is stronger") → ADVICE when the assistant just discussed their CVs/portfolios/jobs, NOT UNCLEAR.
- "create a CV for [role]", "resume for forward deployed engineer", "tailor for staff PM role" → JOB_APPLICATION (tags: role-tailor, job-application, skill-gap), NOT generic ADVICE.
- "what can you do", "help" (alone), "how can you help" → ADVICE (capabilities), NOT CHITCHAT.
- CHITCHAT canned welcome is only for bare greetings with no ask.

Also return helpful tags (kebab-case) the assistant can use to load guidance, e.g. cv-best-practices, star, par, cover-letter, job-application, role-tailor, ats, portfolio, advice, account-info, capabilities, skill-gap.

Respond ONLY with JSON: {"category": <one of the above>, "confidence": <0..1>, "tags": [..], "reason": <short>, "params": {"topic": <for OUT_OF_SCOPE, a short human phrase like "buying things">}}.`

func (s *Service) llmClassify(
	ctx context.Context,
	userText string,
	assistantContext model.AssistantContextInput,
	history []*model.AssistantMessage,
) (Classification, error) {
	var b strings.Builder
	b.WriteString("UI view: ")
	b.WriteString(string(assistantContext.View))
	b.WriteString("\n")
	if prev := lastAssistantMessage(history); prev != "" {
		b.WriteString("Assistant's previous message: ")
		b.WriteString(truncate(prev, 200))
		b.WriteString("\n")
	}
	b.WriteString("User message: ")
	b.WriteString(userText)

	req := openai.ChatCompletionRequest{
		Model: s.miniModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: classifierSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: b.String()},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		MaxTokens: 200,
	}
	if !modelHasFixedSamplingParams(s.miniModel) {
		req.Temperature = 0
	}

	resp, err := s.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return Classification{}, err
	}
	if len(resp.Choices) == 0 {
		return Classification{}, fmt.Errorf("classifier returned no choices")
	}
	return parseClassifierJSON(resp.Choices[0].Message.Content)
}

type classifierPayload struct {
	Category   string            `json:"category"`
	Confidence float64           `json:"confidence"`
	Tags       []string          `json:"tags"`
	Reason     string            `json:"reason"`
	Params     map[string]string `json:"params"`
}

func parseClassifierJSON(raw string) (Classification, error) {
	raw = strings.TrimSpace(raw)
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start < 0 || end <= start {
		return Classification{}, fmt.Errorf("no json object in classifier output")
	}
	var payload classifierPayload
	if err := json.Unmarshal([]byte(raw[start:end+1]), &payload); err != nil {
		return Classification{}, err
	}
	category := model.AssistantCategory(strings.ToUpper(strings.TrimSpace(payload.Category)))
	if !category.IsValid() {
		return Classification{}, fmt.Errorf("invalid category %q", payload.Category)
	}
	conf := payload.Confidence
	if conf < 0 {
		conf = 0
	}
	if conf > 1 {
		conf = 1
	}
	return Classification{
		Category:   category,
		Confidence: conf,
		Tags:       payload.Tags,
		Params:     payload.Params,
		Reason:     payload.Reason,
		Source:     "classifier",
	}, nil
}

func lastAssistantMessage(history []*model.AssistantMessage) string {
	for i := len(history) - 1; i >= 0; i-- {
		if history[i] != nil && history[i].Role == model.AssistantMessageRoleAssistant {
			return history[i].Content
		}
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}

// ScopeReply returns the canned, no-tool reply for a scope-handled category.
func ScopeReply(class Classification, userText string) string {
	switch class.Category {
	case model.AssistantCategoryOutOfScope:
		topic := strings.TrimSpace(class.Params["topic"])
		if topic == "" || topic == "that" {
			return "That's outside what I do, I'm here for your CV, portfolio, and job applications. Want a hand with any of those?"
		}
		return fmt.Sprintf("I can't help with %s, I'm here for your CV, portfolio, and job applications. Want a hand with any of those?", topic)
	case model.AssistantCategoryChitchat:
		return "Hey! I'm Yuse, I help with your CV, portfolio, and job applications. What would you like to work on?"
	case model.AssistantCategoryUnclear:
		quoted := strings.TrimSpace(userText)
		if quoted == "" {
			return "I'm not sure what you'd like to do. Want to update your CV, build a portfolio, work on a job application, or get some advice?"
		}
		return fmt.Sprintf("I'm not sure what you meant by %q. Do you want to update your CV, build a portfolio, work on a job application, or get some advice?", quoted)
	default:
		return ""
	}
}
