package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/internal/linkedin"
	openai "github.com/sashabaranov/go-openai"
)

const jobMatchBatchSize = 15

// JobMatchInput is one job evaluated against user criteria.
type JobMatchInput struct {
	JobID       string `json:"jobId"`
	Title       string `json:"title"`
	Company     string `json:"company,omitempty"`
	Location    string `json:"location,omitempty"`
	Description string `json:"description,omitempty"`
}

// JobMatchResult is the LLM verdict for one job.
type JobMatchResult struct {
	JobID  string `json:"jobId"`
	Match  bool   `json:"match"`
	Reason string `json:"reason"`
}

// MatchContext carries taste signals and bans for smarter matching.
type MatchContext struct {
	BannedCompanies  []string
	LikedSummary     string
	DislikedSummary  string
	LikedExamples    []JobMatchInput
	DislikedExamples []JobMatchInput
}

type jobMatchResponse struct {
	Results []JobMatchResult `json:"results"`
}

// MatchJobs evaluates jobs against natural-language criteria with optional taste context.
func (s *Service) MatchJobs(ctx context.Context, criteria string, jobs []linkedin.JobCard, taste MatchContext) ([]JobMatchResult, error) {
	criteria = strings.TrimSpace(criteria)
	if criteria == "" {
		return nil, fmt.Errorf("match criteria is required")
	}
	if len(jobs) == 0 {
		return nil, nil
	}
	if !s.hasAPIKey || s.client == nil {
		return nil, ErrMissingAPIKey
	}

	inputs := make([]JobMatchInput, 0, len(jobs))
	for _, job := range jobs {
		inputs = append(inputs, JobMatchInput{
			JobID:       job.JobID,
			Title:       job.Title,
			Company:     job.Company,
			Location:    job.Location,
			Description: truncateForMatch(job.Description, 1200),
		})
	}

	var all []JobMatchResult
	for i := 0; i < len(inputs); i += jobMatchBatchSize {
		end := i + jobMatchBatchSize
		if end > len(inputs) {
			end = len(inputs)
		}
		batch, err := s.matchJobBatch(ctx, criteria, inputs[i:end], taste)
		if err != nil {
			return nil, err
		}
		all = append(all, batch...)
	}
	return all, nil
}

func (s *Service) matchJobBatch(ctx context.Context, criteria string, jobs []JobMatchInput, taste MatchContext) ([]JobMatchResult, error) {
	payload, err := json.Marshal(jobs)
	if err != nil {
		return nil, err
	}

	system := buildMatchSystemPrompt(taste)
	user := fmt.Sprintf("Criteria:\n%s\n\nJobs JSON:\n%s", criteria, string(payload))

	req := openai.ChatCompletionRequest{
		Model: s.miniModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: system},
			{Role: openai.ChatMessageRoleUser, Content: user},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Temperature: 0,
		MaxTokens:   4096,
	}
	reconcile, release, err := s.reserveUsage(ctx, "job_match", s.miniModel, req)
	if err != nil {
		return nil, err
	}
	settled := false
	defer func() {
		if !settled {
			releaseUsage(release)
		}
	}()
	resp, err := s.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("job match llm: %w", err)
	}
	if err := reconcileUsage(reconcile, resp.Usage.PromptTokens, resp.Usage.CompletionTokens); err != nil {
		return nil, err
	}
	settled = true
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("job match llm: empty response")
	}

	content := strings.TrimSpace(resp.Choices[0].Message.Content)
	var parsed jobMatchResponse
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return nil, fmt.Errorf("parse job match response: %w", err)
	}
	return parsed.Results, nil
}

func buildMatchSystemPrompt(taste MatchContext) string {
	var b strings.Builder
	b.WriteString(`You filter LinkedIn job listings against the user's criteria.
Return strict JSON only: {"results":[{"jobId":"...","match":true|false,"reason":"one short sentence"}]}
Include every job from the input. Match=true only when the role clearly fits the criteria.`)

	if len(taste.BannedCompanies) > 0 {
		b.WriteString("\n\nNever match jobs from these banned companies: ")
		b.WriteString(strings.Join(taste.BannedCompanies, "; "))
		b.WriteByte('.')
	}
	if strings.TrimSpace(taste.LikedSummary) != "" {
		b.WriteString("\n\nUser taste, prefer: ")
		b.WriteString(strings.TrimSpace(taste.LikedSummary))
	}
	if strings.TrimSpace(taste.DislikedSummary) != "" {
		b.WriteString("\n\nUser taste, avoid: ")
		b.WriteString(strings.TrimSpace(taste.DislikedSummary))
	}
	if len(taste.LikedExamples) > 0 {
		raw, _ := json.Marshal(taste.LikedExamples)
		b.WriteString("\n\nJobs the user liked:\n")
		b.Write(raw)
	}
	if len(taste.DislikedExamples) > 0 {
		raw, _ := json.Marshal(taste.DislikedExamples)
		b.WriteString("\n\nJobs the user disliked (avoid similar):\n")
		b.Write(raw)
	}
	return b.String()
}

func truncateForMatch(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
