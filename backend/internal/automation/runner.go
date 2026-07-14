package automation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/email"
	jobfilter "github.com/leo/ai-weekend/backend/internal/jobs"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// Runner executes job search automations.
type Runner struct {
	Pool      *pgxpool.Pool
	LLM       *llm.Service
	Email     email.Config
	AppOrigin string
}

// RunOutcome is the result of one automation execution.
type RunOutcome struct {
	Run     *store.AutomationRunRecord
	Matches []linkedin.JobCard
}

// RunDue processes automations that are due to run.
func (r *Runner) RunDue(ctx context.Context) (int, error) {
	due, err := store.ListDueJobAutomations(ctx, r.Pool, 20)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, auto := range due {
		if _, err := r.RunOne(ctx, auto); err != nil {
			continue
		}
		processed++
	}
	return processed, nil
}

// RunByID loads and runs an automation for manual triggers without rescheduling.
func (r *Runner) RunByID(ctx context.Context, automationID string) (*RunOutcome, error) {
	return r.RunByIDWithProgress(ctx, automationID, NopProgressSink{})
}

// RunByIDWithProgress is RunByID with live step updates.
func (r *Runner) RunByIDWithProgress(ctx context.Context, automationID string, sink ProgressSink) (*RunOutcome, error) {
	auto, err := store.GetJobAutomationByID(ctx, r.Pool, automationID)
	if err != nil {
		return nil, err
	}
	if auto == nil {
		return nil, fmt.Errorf("automation not found")
	}
	if sink == nil {
		sink = NopProgressSink{}
	}
	return r.runWithAudit(ctx, auto, sink)
}

// RunOne executes a single automation by record (cron path; claims next_run_at).
func (r *Runner) RunOne(ctx context.Context, auto *store.JobAutomationRecord) (*RunOutcome, error) {
	if auto == nil {
		return nil, fmt.Errorf("automation is required")
	}

	if err := store.ClaimJobAutomationRun(ctx, r.Pool, auto.ID, auto.IntervalMinutes); err != nil {
		return nil, err
	}
	return r.runWithAudit(ctx, auto, NopProgressSink{})
}

func (r *Runner) runWithAudit(ctx context.Context, auto *store.JobAutomationRecord, sink ProgressSink) (*RunOutcome, error) {
	started := time.Now().UTC()
	run := &store.AutomationRunRecord{
		AutomationID: auto.ID,
		StartedAt:    started,
		Status:       "RUNNING",
	}
	if err := store.InsertAutomationRun(ctx, r.Pool, run); err != nil {
		return nil, err
	}
	emit(sink, "run", "Run started", "running", map[string]any{"runId": run.ID})

	outcome, runErr := r.execute(ctx, auto, run.ID, sink)
	run.JobsFetched = outcome.Run.JobsFetched
	run.JobsMatched = outcome.Run.JobsMatched
	run.JobsEmailed = outcome.Run.JobsEmailed
	finished := time.Now().UTC()
	run.FinishedAt = &finished

	if runErr != nil {
		msg := runErr.Error()
		run.Error = &msg
		if linkedin.IsSessionError(runErr) {
			run.Status = "SKIPPED"
			_ = store.SetAutomationSessionInvalid(ctx, r.Pool, auto.ID, true)
			_ = store.SetUserAutomationsSessionInvalid(ctx, r.Pool, auto.UserID, true)
			notify := auto.NotifyEmail
			if notify == "" {
				notify, _ = store.GetUserEmail(ctx, r.Pool, auto.UserID)
			}
			_ = email.SendLinkedInSessionExpiredEmail(r.Email, notify, strings.TrimRight(r.AppOrigin, "/"))
			emit(sink, "run", "Skipped: LinkedIn session expired", "error", map[string]any{
				"status": "SKIPPED",
				"error":  msg,
			})
		} else {
			run.Status = "FAILED"
			emit(sink, "run", "Run failed", "error", map[string]any{
				"status": "FAILED",
				"error":  msg,
			})
		}
		_ = store.UpdateAutomationRun(ctx, r.Pool, run)
		outcome.Run = run
		return outcome, runErr
	}

	run.Status = "SUCCESS"
	run.Error = nil
	_ = store.UpdateAutomationRun(ctx, r.Pool, run)
	outcome.Run = run
	emit(sink, "run", "Run finished", "done", map[string]any{
		"status":      "SUCCESS",
		"jobsFetched": run.JobsFetched,
		"jobsMatched": run.JobsMatched,
		"jobsEmailed": run.JobsEmailed,
	})
	return outcome, nil
}

func (r *Runner) execute(ctx context.Context, auto *store.JobAutomationRecord, runID string, sink ProgressSink) (*RunOutcome, error) {
	outcome := &RunOutcome{
		Run: &store.AutomationRunRecord{AutomationID: auto.ID},
	}

	emit(sink, "session", "Checking LinkedIn session", "running", nil)
	session, err := store.LinkedInSessionCookieForUser(ctx, r.Pool, auto.UserID)
	if err != nil {
		emit(sink, "session", "LinkedIn session missing", "error", nil)
		return outcome, fmt.Errorf("linkedin session is not configured; save your session in Automations")
	}
	emit(sink, "session", "LinkedIn session ready", "done", nil)

	emit(sink, "search", "Searching LinkedIn jobs", "running", nil)
	params := automationSearchParams(auto, session)
	cards, err := linkedin.SearchJobs(ctx, params)
	if err != nil {
		emit(sink, "search", "LinkedIn search failed", "error", nil)
		return outcome, err
	}
	outcome.Run.JobsFetched = len(cards)
	emit(sink, "search", fmt.Sprintf("Fetched %d jobs", len(cards)), "done", map[string]any{
		"jobsFetched": len(cards),
	})

	emit(sink, "filter", "Filtering banned companies and applied jobs", "running", nil)
	filter := jobfilter.CandidateFilter{UserID: auto.UserID, Pool: r.Pool}
	cards, _, err = filter.Filter(ctx, cards)
	if err != nil {
		emit(sink, "filter", "Filter failed", "error", nil)
		return outcome, err
	}
	emit(sink, "filter", fmt.Sprintf("%d candidates after filters", len(cards)), "done", map[string]any{
		"candidates": len(cards),
	})

	bans, err := store.ListCompanyBansForUser(ctx, r.Pool, auto.UserID)
	if err != nil {
		return outcome, err
	}

	jobIDs := make([]string, 0, len(cards))
	for _, job := range cards {
		jobIDs = append(jobIDs, job.JobID)
	}

	emit(sink, "unseen", "Keeping new jobs only", "running", nil)
	unseenIDs, err := store.FilterUnseenJobIDs(ctx, r.Pool, auto.ID, jobIDs)
	if err != nil {
		emit(sink, "unseen", "Failed to check seen jobs", "error", nil)
		return outcome, err
	}
	unseenSet := make(map[string]struct{}, len(unseenIDs))
	for _, id := range unseenIDs {
		unseenSet[id] = struct{}{}
	}

	newJobs := make([]linkedin.JobCard, 0, len(unseenIDs))
	for _, job := range cards {
		if _, ok := unseenSet[job.JobID]; ok {
			newJobs = append(newJobs, job)
		}
	}
	emit(sink, "unseen", fmt.Sprintf("%d new jobs to match", len(newJobs)), "done", map[string]any{
		"newJobs": len(newJobs),
	})

	matchContext, err := r.loadMatchContext(ctx, auto.UserID, bans)
	if err != nil {
		return outcome, err
	}

	var matches []linkedin.JobCard
	matchReasons := make(map[string]string)
	emit(sink, "match", "Matching jobs with AI", "running", nil)
	if len(newJobs) > 0 {
		results, err := r.LLM.MatchJobs(ctx, auto.MatchCriteria, newJobs, matchContext)
		if err != nil {
			emit(sink, "match", "Matching failed", "error", nil)
			return outcome, err
		}
		for _, res := range results {
			if res.Match {
				matchReasons[res.JobID] = res.Reason
			}
		}
		for _, job := range newJobs {
			if _, ok := matchReasons[job.JobID]; ok {
				matches = append(matches, job)
			}
		}
	}
	emit(sink, "match", fmt.Sprintf("%d matches", len(matches)), "done", map[string]any{
		"jobsMatched": len(matches),
	})

	if err := store.MarkAutomationJobsSeen(ctx, r.Pool, auto.ID, jobIDs); err != nil {
		return outcome, err
	}

	outcome.Matches = matches
	outcome.Run.JobsMatched = len(matches)

	emit(sink, "save", "Saving matches", "running", nil)
	if len(matches) > 0 {
		matchInputs := jobCardsToMatchInputs(matches, matchReasons)
		newMatchIDs, err := store.UpsertAutomationMatches(ctx, r.Pool, auto.ID, runID, matchInputs)
		if err != nil {
			emit(sink, "save", "Failed to save matches", "error", nil)
			return outcome, err
		}
		emit(sink, "save", fmt.Sprintf("Saved %d matches", len(matches)), "done", map[string]any{
			"saved": len(matches),
		})

		emit(sink, "email", "Sending match email", "running", nil)
		newMatches := filterJobsByID(matches, newMatchIDs)
		if len(newMatches) > 0 {
			to := strings.TrimSpace(auto.NotifyEmail)
			if to == "" {
				to, err = store.GetUserEmail(ctx, r.Pool, auto.UserID)
				if err != nil {
					emit(sink, "email", "Failed to resolve notify email", "error", nil)
					return outcome, err
				}
			}
			if err := email.SendJobAutomationMatchesEmail(r.Email, to, auto.Name, jobMatchItems(newMatches)); err != nil {
				emit(sink, "email", "Failed to send email", "error", nil)
				return outcome, err
			}
			if err := store.MarkAutomationMatchesNotified(ctx, r.Pool, auto.ID, newMatchIDs); err != nil {
				return outcome, err
			}
			outcome.Run.JobsEmailed = len(newMatches)
			emit(sink, "email", fmt.Sprintf("Emailed %d matches", len(newMatches)), "done", map[string]any{
				"jobsEmailed": len(newMatches),
			})
		} else {
			emit(sink, "email", "No new matches to email", "done", map[string]any{
				"jobsEmailed": 0,
			})
		}
	} else {
		emit(sink, "save", "No matches to save", "done", nil)
		emit(sink, "email", "Skipped email", "done", map[string]any{"jobsEmailed": 0})
	}

	if auto.SessionInvalid {
		_ = store.SetAutomationSessionInvalid(ctx, r.Pool, auto.ID, false)
	}

	return outcome, nil
}

func (r *Runner) loadMatchContext(ctx context.Context, userID string, bans []*store.AutomationCompanyBanRecord) (llm.MatchContext, error) {
	_ = r.LLM.RefreshTasteProfileIfNeeded(ctx, store.PoolTasteStore{Pool: r.Pool}, userID)

	profile, err := store.GetTasteProfile(ctx, r.Pool, userID)
	if err != nil {
		return llm.MatchContext{}, err
	}
	liked, disliked, err := store.ListRecentFeedbackExamples(ctx, r.Pool, userID, 5)
	if err != nil {
		return llm.MatchContext{}, err
	}
	return llm.BuildMatchContext(profile, bans, liked, disliked), nil
}

func jobCardsToMatchInputs(jobs []linkedin.JobCard, reasons map[string]string) []store.AutomationMatchInput {
	out := make([]store.AutomationMatchInput, 0, len(jobs))
	for _, job := range jobs {
		out = append(out, store.AutomationMatchInput{
			JobID:          job.JobID,
			Title:          job.Title,
			Company:        job.Company,
			Location:       job.Location,
			WorkplaceType:  job.WorkplaceType,
			EmploymentType: job.EmploymentType,
			ListedAt:       job.ListedAt,
			Description:    job.Description,
			URL:            job.URL,
			MatchReason:    reasons[job.JobID],
		})
	}
	return out
}

func filterJobsByID(jobs []linkedin.JobCard, ids []string) []linkedin.JobCard {
	if len(ids) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	out := make([]linkedin.JobCard, 0, len(ids))
	for _, job := range jobs {
		if _, ok := set[job.JobID]; ok {
			out = append(out, job)
		}
	}
	return out
}

func automationSearchParams(auto *store.JobAutomationRecord, session string) linkedin.SearchParams {
	params := linkedin.SearchParams{
		SessionCookie: session,
		TimeFilter:    auto.TimeFilter,
		SortBy:        auto.SortBy,
		MaxResults:    auto.MaxResults,
		EasyApply:     auto.EasyApply,
	}
	if auto.Keywords != nil {
		params.Keywords = *auto.Keywords
	}
	if auto.GeoID != nil {
		params.GeoID = *auto.GeoID
	}
	for _, v := range auto.WorkplaceTypes {
		params.WorkplaceTypes = append(params.WorkplaceTypes, v)
	}
	for _, v := range auto.ExperienceLevels {
		params.ExperienceLevels = append(params.ExperienceLevels, v)
	}
	for _, v := range auto.EmploymentTypes {
		params.EmploymentTypes = append(params.EmploymentTypes, v)
	}
	return params
}

func jobMatchItems(jobs []linkedin.JobCard) []email.JobMatchEmailItem {
	out := make([]email.JobMatchEmailItem, 0, len(jobs))
	for _, job := range jobs {
		out = append(out, email.JobMatchEmailItem{
			Title:    job.Title,
			Company:  job.Company,
			Location: job.Location,
			URL:      job.URL,
		})
	}
	return out
}
