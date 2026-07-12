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

type jobMatchResponse struct {
	Results []JobMatchResult `json:"results"`
}

// MatchJobs evaluates jobs against natural-language criteria. All fetched job IDs
// should be marked seen regardless of match outcome.
func (s *Service) MatchJobs(ctx context.Context, criteria string, jobs []linkedin.JobCard) ([]JobMatchResult, error) {
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
		batch, err := s.matchJobBatch(ctx, criteria, inputs[i:end])
		if err != nil {
			return nil, err
		}
		all = append(all, batch...)
	}
	return all, nil
}

func (s *Service) matchJobBatch(ctx context.Context, criteria string, jobs []JobMatchInput) ([]JobMatchResult, error) {
	payload, err := json.Marshal(jobs)
	if err != nil {
		return nil, err
	}

	system := `You filter LinkedIn job listings against the user's criteria.
Return strict JSON only: {"results":[{"jobId":"...","match":true|false,"reason":"one short sentence"}]}
Include every job from the input. Match=true only when the role clearly fits the criteria.`

	user := fmt.Sprintf("Criteria:\n%s\n\nJobs JSON:\n%s", criteria, string(payload))

	resp, err := s.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: s.miniModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: system},
			{Role: openai.ChatMessageRoleUser, Content: user},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Temperature: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("job match llm: %w", err)
	}
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

func truncateForMatch(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
