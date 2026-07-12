package automation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/email"
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
			// Continue with other automations; error is recorded on the run row.
			continue
		}
		processed++
	}
	return processed, nil
}

// RunOne executes a single automation by record (cron path; claims next_run_at).
func (r *Runner) RunOne(ctx context.Context, auto *store.JobAutomationRecord) (*RunOutcome, error) {
	if auto == nil {
		return nil, fmt.Errorf("automation is required")
	}

	if err := store.ClaimJobAutomationRun(ctx, r.Pool, auto.ID, auto.IntervalMinutes); err != nil {
		return nil, err
	}
	return r.runWithAudit(ctx, auto)
}

// RunByID loads and runs an automation for manual triggers without rescheduling.
func (r *Runner) RunByID(ctx context.Context, automationID string) (*RunOutcome, error) {
	auto, err := store.GetJobAutomationByID(ctx, r.Pool, automationID)
	if err != nil {
		return nil, err
	}
	if auto == nil {
		return nil, fmt.Errorf("automation not found")
	}
	return r.runWithAudit(ctx, auto)
}

func (r *Runner) runWithAudit(ctx context.Context, auto *store.JobAutomationRecord) (*RunOutcome, error) {
	started := time.Now().UTC()
	run := &store.AutomationRunRecord{
		AutomationID: auto.ID,
		StartedAt:    started,
		Status:       "RUNNING",
	}
	if err := store.InsertAutomationRun(ctx, r.Pool, run); err != nil {
		return nil, err
	}

	outcome, runErr := r.execute(ctx, auto)
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
		} else {
			run.Status = "FAILED"
		}
		_ = store.UpdateAutomationRun(ctx, r.Pool, run)
		outcome.Run = run
		return outcome, runErr
	}

	run.Status = "SUCCESS"
	run.Error = nil
	_ = store.UpdateAutomationRun(ctx, r.Pool, run)
	outcome.Run = run
	return outcome, nil
}

func (r *Runner) execute(ctx context.Context, auto *store.JobAutomationRecord) (*RunOutcome, error) {
	outcome := &RunOutcome{
		Run: &store.AutomationRunRecord{AutomationID: auto.ID},
	}

	session, err := store.LinkedInSessionCookieForUser(ctx, r.Pool, auto.UserID)
	if err != nil {
		return outcome, fmt.Errorf("linkedin session is not configured; save your session in Automations")
	}

	params := automationSearchParams(auto, session)
	jobs, err := linkedin.SearchJobs(ctx, params)
	if err != nil {
		return outcome, err
	}
	outcome.Run.JobsFetched = len(jobs)

	jobIDs := make([]string, 0, len(jobs))
	for _, job := range jobs {
		jobIDs = append(jobIDs, job.JobID)
	}

	unseenIDs, err := store.FilterUnseenJobIDs(ctx, r.Pool, auto.ID, jobIDs)
	if err != nil {
		return outcome, err
	}
	unseenSet := make(map[string]struct{}, len(unseenIDs))
	for _, id := range unseenIDs {
		unseenSet[id] = struct{}{}
	}

	newJobs := make([]linkedin.JobCard, 0, len(unseenIDs))
	for _, job := range jobs {
		if _, ok := unseenSet[job.JobID]; ok {
			newJobs = append(newJobs, job)
		}
	}

	var matches []linkedin.JobCard
	if len(newJobs) > 0 {
		results, err := r.LLM.MatchJobs(ctx, auto.MatchCriteria, newJobs)
		if err != nil {
			return outcome, err
		}
		matchSet := make(map[string]string, len(results))
		for _, res := range results {
			if res.Match {
				matchSet[res.JobID] = res.Reason
			}
		}
		for _, job := range newJobs {
			if _, ok := matchSet[job.JobID]; ok {
				matches = append(matches, job)
			}
		}
	}

	if err := store.MarkAutomationJobsSeen(ctx, r.Pool, auto.ID, jobIDs); err != nil {
		return outcome, err
	}

	outcome.Matches = matches
	outcome.Run.JobsMatched = len(matches)

	if len(matches) > 0 {
		to := strings.TrimSpace(auto.NotifyEmail)
		if to == "" {
			to, err = store.GetUserEmail(ctx, r.Pool, auto.UserID)
			if err != nil {
				return outcome, err
			}
		}
		if err := email.SendJobAutomationMatchesEmail(r.Email, to, auto.Name, jobMatchItems(matches)); err != nil {
			return outcome, err
		}
		outcome.Run.JobsEmailed = len(matches)
	}

	if auto.SessionInvalid {
		_ = store.SetAutomationSessionInvalid(ctx, r.Pool, auto.ID, false)
	}

	return outcome, nil
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
