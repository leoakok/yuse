package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/leo/ai-weekend/backend/internal/store"
	openai "github.com/sashabaranov/go-openai"
)

const tasteProfileStaleAfter = time.Hour

type tasteJobExample struct {
	Title       string `json:"title"`
	Company     string `json:"company,omitempty"`
	MatchReason string `json:"matchReason,omitempty"`
}

type tasteRefreshResponse struct {
	LikedSummary    string `json:"likedSummary"`
	DislikedSummary string `json:"dislikedSummary"`
}

// RefreshTasteProfileIfNeeded updates the user's taste summaries when stale or early feedback.
func (s *Service) RefreshTasteProfileIfNeeded(ctx context.Context, pool store.TasteProfileStore, userID string) error {
	if !s.hasAPIKey || s.client == nil {
		return nil
	}
	profile, err := pool.GetTasteProfile(ctx, userID)
	if err != nil {
		return err
	}
	count, err := pool.CountUserFeedback(ctx, userID)
	if err != nil {
		return err
	}
	if count == 0 {
		return nil
	}
	stale := profile.UpdatedAt.IsZero() || time.Since(profile.UpdatedAt) > tasteProfileStaleAfter
	if count >= 5 && !stale {
		return nil
	}

	likedJobs, err := pool.ListFeedbackJobsForTaste(ctx, userID, store.MatchFeedbackLiked, 20)
	if err != nil {
		return err
	}
	dislikedJobs, err := pool.ListFeedbackJobsForTaste(ctx, userID, store.MatchFeedbackDisliked, 20)
	if err != nil {
		return err
	}
	if len(likedJobs) == 0 && len(dislikedJobs) == 0 {
		return nil
	}

	likedSummary, dislikedSummary, err := s.summarizeTaste(ctx, likedJobs, dislikedJobs)
	if err != nil {
		return err
	}
	return pool.UpsertTasteProfile(ctx, userID, likedSummary, dislikedSummary)
}

func (s *Service) summarizeTaste(ctx context.Context, liked, disliked []*store.AutomationMatchedJobRecord) (string, string, error) {
	likedExamples := tasteExamplesFromRecords(liked)
	dislikedExamples := tasteExamplesFromRecords(disliked)

	payload := map[string]any{
		"likedJobs":    likedExamples,
		"dislikedJobs": dislikedExamples,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	system := `You summarize a user's job search taste from liked and disliked matches.
Return strict JSON only: {"likedSummary":"2-3 sentences","dislikedSummary":"2-3 sentences"}
likedSummary: patterns the user prefers (roles, industries, seniority, company types).
dislikedSummary: patterns to avoid. Empty string if no examples for that side.`

	req := openai.ChatCompletionRequest{
		Model: s.miniModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: system},
			{Role: openai.ChatMessageRoleUser, Content: string(raw)},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Temperature: 0,
		MaxTokens:   1024,
	}
	reconcile, release, err := s.reserveUsage(ctx, "taste_profile", s.miniModel, req)
	if err != nil {
		return "", "", err
	}
	settled := false
	defer func() {
		if !settled {
			releaseUsage(release)
		}
	}()
	resp, err := s.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", "", fmt.Errorf("taste profile llm: %w", err)
	}
	if err := reconcileUsage(reconcile, resp.Usage.PromptTokens, resp.Usage.CompletionTokens); err != nil {
		return "", "", err
	}
	settled = true
	if len(resp.Choices) == 0 {
		return "", "", fmt.Errorf("taste profile llm: empty response")
	}

	var parsed tasteRefreshResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp.Choices[0].Message.Content)), &parsed); err != nil {
		return "", "", fmt.Errorf("parse taste profile: %w", err)
	}
	return strings.TrimSpace(parsed.LikedSummary), strings.TrimSpace(parsed.DislikedSummary), nil
}

func tasteExamplesFromRecords(rows []*store.AutomationMatchedJobRecord) []tasteJobExample {
	out := make([]tasteJobExample, 0, len(rows))
	for _, row := range rows {
		ex := tasteJobExample{Title: row.Title}
		if row.Company != nil {
			ex.Company = *row.Company
		}
		if row.MatchReason != nil {
			ex.MatchReason = *row.MatchReason
		}
		out = append(out, ex)
	}
	return out
}

// BuildMatchContext assembles taste signals for job matching.
func BuildMatchContext(
	profile *store.AutomationTasteProfileRecord,
	bans []*store.AutomationCompanyBanRecord,
	likedExamples, dislikedExamples []*store.AutomationMatchedJobRecord,
) MatchContext {
	ctx := MatchContext{}
	if profile != nil {
		ctx.LikedSummary = profile.LikedSummary
		ctx.DislikedSummary = profile.DislikedSummary
	}
	for _, ban := range bans {
		ctx.BannedCompanies = append(ctx.BannedCompanies, ban.CompanyDisplay)
	}
	for _, row := range likedExamples {
		ctx.LikedExamples = append(ctx.LikedExamples, matchInputFromRecord(row))
	}
	for _, row := range dislikedExamples {
		ctx.DislikedExamples = append(ctx.DislikedExamples, matchInputFromRecord(row))
	}
	return ctx
}

func matchInputFromRecord(row *store.AutomationMatchedJobRecord) JobMatchInput {
	in := JobMatchInput{
		JobID: row.JobID,
		Title: row.Title,
	}
	if row.Company != nil {
		in.Company = *row.Company
	}
	if row.Location != nil {
		in.Location = *row.Location
	}
	if row.MatchReason != nil {
		in.Description = *row.MatchReason
	}
	return in
}
