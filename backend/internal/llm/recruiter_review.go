package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/internal/mcp"
	openai "github.com/sashabaranov/go-openai"
)

const (
	roleTailorMinRecruiterScore = 70
	maxRecruiterReviewPasses    = 2
)

// RecruiterFix is one actionable improvement for a tailored CV.
type RecruiterFix struct {
	SectionType string `json:"sectionType"`
	Issue       string `json:"issue"`
	Suggestion  string `json:"suggestion"`
}

// RecruiterReviewResult is the structured output of the recruiter judge pass.
type RecruiterReviewResult struct {
	Score         int            `json:"score"`
	FitAssessment string         `json:"fitAssessment"`
	Gaps          []string       `json:"gaps"`
	Fixes         []RecruiterFix `json:"fixes"`
	Passed        bool           `json:"passed"`
}

const recruiterReviewSystemPrompt = `You are a senior technical recruiter reviewing a role-tailored CV draft.

Compare the resume JSON to the target role and researched requirements. Score 0-100 for how well this CV would pass a first recruiter screen for the role.

Return JSON only:
{
  "score": <0-100>,
  "fitAssessment": "<one sentence: strong fit, partial fit, or weak fit with reason>",
  "gaps": ["<remaining gap vs role requirements>"],
  "fixes": [
    {"sectionType": "SUMMARY|EXPERIENCE|PROJECTS|SKILLS", "issue": "<what is weak>", "suggestion": "<specific rewrite or add guidance>"}
  ],
  "passed": <true if score >= 70 and SUMMARY plus at least two experience/project bullets clearly match role keywords>
}

Be strict: thin generic summaries, single experience item, or missing role keywords should fail. Fixes must be concrete and limited to the top 3 issues.`

func (s *Service) recruiterReview(
	ctx context.Context,
	roleTitle string,
	requirementsSummary string,
	resumeContentJSON string,
) (RecruiterReviewResult, error) {
	if !s.hasAPIKey || s.client == nil {
		return RecruiterReviewResult{Passed: true, Score: 100, FitAssessment: "skipped (no API key)"}, nil
	}
	roleTitle = strings.TrimSpace(roleTitle)
	if roleTitle == "" {
		roleTitle = "target role"
	}
	requirementsSummary = strings.TrimSpace(requirementsSummary)
	if requirementsSummary == "" {
		requirementsSummary = "No research summary captured."
	}
	resumeContentJSON = strings.TrimSpace(resumeContentJSON)
	if resumeContentJSON == "" {
		return RecruiterReviewResult{}, fmt.Errorf("resume content required for recruiter review")
	}

	var b strings.Builder
	b.WriteString("Target role: ")
	b.WriteString(roleTitle)
	b.WriteString("\n\nResearched requirements:\n")
	b.WriteString(truncate(requirementsSummary, 4000))
	b.WriteString("\n\nResume JSON:\n")
	b.WriteString(truncate(resumeContentJSON, 12000))

	req := openai.ChatCompletionRequest{
		Model: s.miniModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: recruiterReviewSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: b.String()},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		MaxTokens: 800,
	}
	if !modelHasFixedSamplingParams(s.miniModel) {
		req.Temperature = 0
	}

	resp, err := s.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return RecruiterReviewResult{}, err
	}
	if len(resp.Choices) == 0 {
		return RecruiterReviewResult{}, fmt.Errorf("recruiter review returned no choices")
	}
	return parseRecruiterReviewJSON(resp.Choices[0].Message.Content)
}

func parseRecruiterReviewJSON(raw string) (RecruiterReviewResult, error) {
	raw = strings.TrimSpace(raw)
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start < 0 || end <= start {
		return RecruiterReviewResult{}, fmt.Errorf("no json object in recruiter review output")
	}
	var result RecruiterReviewResult
	if err := json.Unmarshal([]byte(raw[start:end+1]), &result); err != nil {
		return RecruiterReviewResult{}, err
	}
	if result.Score < 0 {
		result.Score = 0
	}
	if result.Score > 100 {
		result.Score = 100
	}
	if result.Score >= roleTailorMinRecruiterScore && len(result.Fixes) == 0 {
		result.Passed = true
	}
	return result, nil
}

func recruiterReviewNudge(review RecruiterReviewResult) string {
	var b strings.Builder
	b.WriteString("Recruiter review flagged weak tailoring (score ")
	fmt.Fprintf(&b, "%d", review.Score)
	b.WriteString("). Do not reply yet. Apply fixes with update_section_item or add_section_item, then call get_resume_content again.\n")
	if review.FitAssessment != "" {
		b.WriteString("Fit: ")
		b.WriteString(review.FitAssessment)
		b.WriteString("\n")
	}
	for i, fix := range review.Fixes {
		if i >= 3 {
			break
		}
		b.WriteString("- ")
		if fix.SectionType != "" {
			b.WriteString(fix.SectionType)
			b.WriteString(": ")
		}
		if fix.Issue != "" {
			b.WriteString(fix.Issue)
		}
		if fix.Suggestion != "" {
			b.WriteString(" → ")
			b.WriteString(fix.Suggestion)
		}
		b.WriteString("\n")
	}
	if len(review.Gaps) > 0 {
		b.WriteString("Remaining gaps to mention in your final reply: ")
		b.WriteString(strings.Join(review.Gaps, "; "))
	}
	return strings.TrimSpace(b.String())
}

func extractRoleTitle(userText string) string {
	lower := strings.ToLower(strings.TrimSpace(userText))
	prefixes := []string{
		"create a cv for ",
		"create a resume for ",
		"make a cv for ",
		"make a resume for ",
		"build a cv for ",
		"build a resume for ",
		"generate a cv for ",
		"generate a resume for ",
		"cv for ",
		"resume for ",
		"tailor for ",
		"tailor to ",
	}
	for _, prefix := range prefixes {
		if idx := strings.Index(lower, prefix); idx >= 0 {
			rest := strings.TrimSpace(userText[idx+len(prefix):])
			rest = strings.TrimSuffix(rest, ".")
			rest = strings.TrimSuffix(rest, "?")
			rest = strings.TrimSuffix(strings.ToLower(rest), " role")
			return strings.TrimSpace(rest)
		}
	}
	return ""
}

func researchSummaryFromExecutions(executions []mcp.Execution) string {
	var parts []string
	for _, exec := range executions {
		if exec.Error != "" {
			continue
		}
		switch exec.Tool {
		case "web_search":
			if snippet := researchSnippetFromWebSearch(exec.Result); snippet != "" {
				parts = append(parts, snippet)
			}
		case "fetch_url":
			if snippet := researchSnippetFromFetch(exec.Result); snippet != "" {
				parts = append(parts, snippet)
			}
		}
	}
	return strings.Join(parts, "\n\n")
}

func researchSnippetFromWebSearch(result any) string {
	m, ok := result.(map[string]any)
	if !ok {
		return ""
	}
	query, _ := m["query"].(string)
	var lines []string
	if query != "" {
		lines = append(lines, "Search: "+query)
	}
	switch results := m["results"].(type) {
	case []map[string]string:
		for i, r := range results {
			if i >= 5 {
				break
			}
			line := strings.TrimSpace(r["title"] + " " + r["snippet"])
			if line != "" {
				lines = append(lines, line)
			}
		}
	case []any:
		for i, item := range results {
			if i >= 5 {
				break
			}
			if rm, ok := item.(map[string]any); ok {
				title, _ := rm["title"].(string)
				snippet, _ := rm["snippet"].(string)
				line := strings.TrimSpace(title + " " + snippet)
				if line != "" {
					lines = append(lines, line)
				}
			}
		}
	}
	return strings.Join(lines, "\n")
}

func researchSnippetFromFetch(result any) string {
	m, ok := result.(map[string]any)
	if !ok {
		return ""
	}
	url, _ := m["url"].(string)
	text, _ := m["text"].(string)
	if text == "" {
		text, _ = m["content"].(string)
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	header := "Page"
	if url != "" {
		header = url
	}
	return header + ":\n" + truncate(text, 1500)
}

func resumeContentJSONFromExecutions(executions []mcp.Execution) string {
	for i := len(executions) - 1; i >= 0; i-- {
		exec := executions[i]
		if exec.Error != "" || exec.Tool != "get_resume_content" {
			continue
		}
		if exec.Result == nil {
			continue
		}
		raw, err := json.Marshal(exec.Result)
		if err != nil {
			continue
		}
		return string(raw)
	}
	return ""
}
