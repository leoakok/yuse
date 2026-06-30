package cv

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/storage"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type Service struct {
	store  store.Store
	llm    *llm.Service
	photos storage.ProfilePhotoUploader
}

func NewService(dataStore store.Store, llmService *llm.Service, photos storage.ProfilePhotoUploader) *Service {
	return &Service{
		store:  dataStore,
		llm:    llmService,
		photos: photos,
	}
}

func (s *Service) Me() *model.User {
	return s.store.User()
}

func (s *Service) MyWorkspace() *model.Workspace {
	return s.store.Workspace()
}

func (s *Service) WorkspaceStats() *model.WorkspaceStats {
	return s.store.WorkspaceStats()
}

func (s *Service) ListResumes() []*model.Resume {
	return s.store.ListResumes()
}

func (s *Service) GetResume(id string) (*model.Resume, error) {
	return s.store.GetResume(id)
}

func (s *Service) ListSections(sectionType *model.SectionType) []*model.Section {
	return s.store.ListSections(sectionType)
}

func (s *Service) GetSection(id string) (*model.Section, error) {
	return s.store.GetSection(id)
}

func (s *Service) ListSectionItems(sectionType *model.SectionType) []*model.SectionItem {
	return s.store.ListSectionItems(sectionType)
}

func (s *Service) GetSectionItem(id string) (*model.SectionItem, error) {
	return s.store.GetSectionItem(id)
}

func (s *Service) ListContactProfiles() []*model.ContactProfile {
	return s.store.ListContactProfiles()
}

func (s *Service) ListCvThemes() []*model.CvTheme {
	return s.store.ListThemes()
}

func (s *Service) GetResumeWithContent(id string) (*model.ResumeWithContent, error) {
	return s.store.ResumeWithContent(id)
}

func (s *Service) GetSectionItemUsage(id string) (*model.SectionItemUsage, error) {
	return s.store.SectionItemUsage(id)
}

func (s *Service) ResumesForSection(sectionID string) ([]*model.Resume, error) {
	return s.store.ResumesForSection(sectionID)
}

func (s *Service) SectionItemsForSection(sectionID string) ([]*model.SectionItem, error) {
	return s.store.SectionItemsForSection(sectionID)
}

func (s *Service) ListAssistantThreads() []*model.AssistantThread {
	return s.store.ListAssistantThreads()
}

func (s *Service) CreateAssistantThread() (*model.AssistantThread, error) {
	return s.store.CreateAssistantThread()
}

func (s *Service) DeleteAssistantThread(id string) (bool, error) {
	if err := s.store.DeleteAssistantThread(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return true, nil
		}
		return false, err
	}
	return true, nil
}

func (s *Service) ListAssistantMessages(threadID string, limit int) []*model.AssistantMessage {
	if limit <= 0 {
		limit = 50
	}
	return s.store.ListAssistantMessages(threadID, limit)
}

func (s *Service) CreateResume(title string) *model.Resume {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		trimmed = "Untitled Resume"
	}
	return s.store.CreateResume(trimmed)
}

func (s *Service) DuplicateResume(id string) (*model.Resume, error) {
	return s.store.DuplicateResume(id)
}

func (s *Service) DeleteResume(id string) (bool, error) {
	if err := s.store.DeleteResume(id); err != nil {
		return false, err
	}
	return true, nil
}

func (s *Service) UpdateResume(
	id string,
	title *string,
	contactProfileID *string,
) (*model.Resume, error) {
	resume, err := s.store.GetResume(id)
	if err != nil {
		return nil, err
	}
	if title != nil {
		resume.Title = strings.TrimSpace(*title)
	}
	if contactProfileID != nil {
		resume.ContactProfileID = contactProfileID
	}
	resume.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.store.SaveResume(resume)
	return resume, nil
}

func (s *Service) UpdateResumeSettings(input model.UpdateResumeSettingsInput) (*model.ResumeSettings, error) {
	return s.store.UpdateResumeSettings(input.ResumeID, func(settings *model.ResumeSettings) {
		if input.PageFormat != nil {
			settings.PageFormat = *input.PageFormat
		}
		if input.FontSize != nil {
			settings.FontSize = *input.FontSize
		}
		if input.ContactNameFontSize != nil {
			settings.ContactNameFontSize = *input.ContactNameFontSize
		}
		if input.ContactHeadlineFontSize != nil {
			settings.ContactHeadlineFontSize = *input.ContactHeadlineFontSize
		}
		if input.ContactDetailsFontSize != nil {
			settings.ContactDetailsFontSize = *input.ContactDetailsFontSize
		}
		if input.SectionTitleFontSize != nil {
			settings.SectionTitleFontSize = *input.SectionTitleFontSize
		}
		if input.ItemTitleFontSize != nil {
			settings.ItemTitleFontSize = *input.ItemTitleFontSize
		}
		if input.ItemMetaFontSize != nil {
			settings.ItemMetaFontSize = *input.ItemMetaFontSize
		}
		if input.MarginHorizontalMm != nil {
			settings.MarginHorizontalMm = *input.MarginHorizontalMm
		}
		if input.MarginVerticalMm != nil {
			settings.MarginVerticalMm = *input.MarginVerticalMm
		}
		if input.ThemeID != nil {
			settings.ThemeID = *input.ThemeID
		}
		if input.ShowPhoto != nil {
			settings.ShowPhoto = *input.ShowPhoto
		}
		if input.ItemTitleLayout != nil {
			settings.ItemTitleLayout = *input.ItemTitleLayout
		}
		if input.Locale != nil {
			settings.Locale = *input.Locale
		}
	})
}

func (s *Service) UpdateResumeSectionItemVisibility(
	input model.UpdateResumeSectionItemVisibilityInput,
) (*model.ResumeWithContent, error) {
	return s.store.UpdateResumeSectionItemVisibility(
		input.ResumeID,
		input.SectionID,
		input.SectionItemID,
		input.ShowInPreview,
	)
}

func (s *Service) UpdateResumeSectionItem(
	input model.UpdateResumeSectionItemInput,
) (*model.ResumeWithContent, error) {
	return s.store.UpdateResumeSectionItem(
		input.ResumeID,
		input.SectionID,
		input.SectionItemID,
		input.Headline,
		input.Body,
		input.Metadata,
	)
}

func (s *Service) AddResumeSectionItem(
	input model.AddResumeSectionItemInput,
) (*model.ResumeWithContent, error) {
	headline := ""
	if input.Headline != nil {
		headline = *input.Headline
	}
	body := ""
	if input.Body != nil {
		body = *input.Body
	}
	return s.store.AddResumeSectionItem(
		input.ResumeID,
		input.SectionID,
		headline,
		body,
		input.Metadata,
	)
}

func (s *Service) DeleteSectionItem(resumeID, sectionItemID string) (*model.ResumeWithContent, error) {
	if err := s.store.DeleteSectionItem(sectionItemID); err != nil {
		return nil, err
	}
	return s.store.ResumeWithContent(resumeID)
}

func (s *Service) UpdateContactProfile(
	ctx context.Context,
	input model.UpdateContactProfileInput,
) (*model.ResumeWithContent, error) {
	if input.PhotoURL != nil && s.photos != nil {
		trimmed := strings.TrimSpace(*input.PhotoURL)
		if trimmed != "" {
			workspace := s.store.Workspace()
			user := s.store.User()
			if workspace == nil || user == nil {
				return nil, fmt.Errorf("session required")
			}
			if err := s.photos.ValidatePhotoURL(ctx, workspace.ID, user.ID, trimmed); err != nil {
				return nil, err
			}
		}
	}
	return s.store.UpdateContactProfile(
		input.ResumeID,
		input.FullName,
		input.Headline,
		input.Email,
		input.Phone,
		input.Location,
		input.Website,
		input.LinkedIn,
		input.Github,
		input.PhotoURL,
		input.LinkedinPhotoURL,
		input.GithubPhotoURL,
	)
}

func (s *Service) RequestProfilePhotoUpload(
	ctx context.Context,
	contentType, fileName string,
) (*model.ProfilePhotoUpload, error) {
	if s.photos == nil {
		return nil, fmt.Errorf("profile photo upload is not configured")
	}
	workspace := s.store.Workspace()
	user := s.store.User()
	if workspace == nil || user == nil {
		return nil, fmt.Errorf("session required")
	}
	req, err := s.photos.RequestUpload(ctx, workspace.ID, user.ID, contentType, fileName)
	if err != nil {
		return nil, err
	}
	maxBytes := int(req.MaxBytes)
	return &model.ProfilePhotoUpload{
		UploadURL:   req.UploadURL,
		PhotoURL:    req.PhotoURL,
		ContentType: req.ContentType,
		MaxBytes:    maxBytes,
	}, nil
}

func (s *Service) ListTwinEntries() []*model.TwinEntry {
	return s.store.ListTwinEntries()
}

func (s *Service) GetTwinEntry(id string) (*model.TwinEntry, error) {
	return s.store.GetTwinEntry(id)
}

func (s *Service) CreateTwinEntry(input model.CreateTwinEntryInput) (*model.TwinEntry, error) {
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, fmt.Errorf("title is required")
	}
	entryType := input.Type
	if !entryType.IsValid() {
		return nil, fmt.Errorf("invalid twin entry type")
	}
	metadata := input.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	return s.store.CreateTwinEntry(&model.TwinEntry{
		Type:     entryType,
		Title:    title,
		Body:     strings.TrimSpace(input.Body),
		Metadata: metadata,
	}), nil
}

func (s *Service) UpdateTwinEntry(input model.UpdateTwinEntryInput) (*model.TwinEntry, error) {
	return s.store.UpdateTwinEntry(input.ID, func(entry *model.TwinEntry) error {
		if input.Type != nil {
			if !input.Type.IsValid() {
				return fmt.Errorf("invalid twin entry type")
			}
			entry.Type = *input.Type
		}
		if input.Title != nil {
			title := strings.TrimSpace(*input.Title)
			if title == "" {
				return fmt.Errorf("title cannot be empty")
			}
			entry.Title = title
		}
		if input.Body != nil {
			entry.Body = *input.Body
		}
		if input.Metadata != nil {
			if entry.Metadata == nil {
				entry.Metadata = map[string]any{}
			}
			for k, v := range input.Metadata {
				entry.Metadata[k] = v
			}
		}
		if input.SortOrder != nil {
			entry.SortOrder = *input.SortOrder
		}
		return nil
	})
}

func (s *Service) DeleteTwinEntry(id string) (bool, error) {
	if err := s.store.DeleteTwinEntry(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *Service) ListTrackedJobs() []*model.TrackedJob {
	return s.store.ListTrackedJobs()
}

func (s *Service) GetTrackedJob(id string) (*model.TrackedJob, error) {
	return s.store.GetTrackedJob(id)
}

func (s *Service) CreateTrackedJob(url string) (*model.TrackedJob, error) {
	trimmed := strings.TrimSpace(url)
	if trimmed == "" {
		return nil, fmt.Errorf("url is required")
	}
	return s.store.CreateTrackedJob(&model.TrackedJob{
		URL:    trimmed,
		Status: model.JobStatusSaved,
	}), nil
}

func (s *Service) UpdateTrackedJob(input model.UpdateTrackedJobInput) (*model.TrackedJob, error) {
	return s.store.UpdateTrackedJob(input.ID, func(job *model.TrackedJob) error {
		if input.Title != nil {
			job.Title = strings.TrimSpace(*input.Title)
		}
		if input.Company != nil {
			job.Company = strings.TrimSpace(*input.Company)
		}
		if input.Status != nil {
			if !input.Status.IsValid() {
				return fmt.Errorf("invalid job status")
			}
			job.Status = *input.Status
		}
		if input.Notes != nil {
			job.Notes = *input.Notes
		}
		if input.ResumeID != nil {
			id := strings.TrimSpace(*input.ResumeID)
			if id == "" {
				job.ResumeID = nil
			} else {
				job.ResumeID = &id
			}
		}
		if input.CoverLetter != nil {
			job.CoverLetter = *input.CoverLetter
		}
		if input.Metadata != nil {
			if job.Metadata == nil {
				job.Metadata = map[string]any{}
			}
			for key, value := range input.Metadata {
				job.Metadata[key] = value
			}
		}
		return nil
	})
}

func (s *Service) DeleteTrackedJob(id string) (bool, error) {
	if err := s.store.DeleteTrackedJob(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *Service) SendAssistantMessage(
	ctx context.Context,
	threadID string,
	text string,
	assistantContext model.AssistantContextInput,
	attachments []*model.AssistantAttachmentInput,
) (*model.AssistantTurnResult, error) {
	return s.sendAssistantMessage(ctx, threadID, text, assistantContext, attachments, nil)
}

func (s *Service) SendAssistantMessageStream(
	ctx context.Context,
	threadID string,
	text string,
	assistantContext model.AssistantContextInput,
	attachments []*model.AssistantAttachmentInput,
	sink llm.StreamSink,
) (*model.AssistantTurnResult, error) {
	return s.sendAssistantMessage(ctx, threadID, text, assistantContext, attachments, sink)
}

func (s *Service) sendAssistantMessage(
	ctx context.Context,
	threadID string,
	text string,
	assistantContext model.AssistantContextInput,
	attachments []*model.AssistantAttachmentInput,
	sink llm.StreamSink,
) (*model.AssistantTurnResult, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, fmt.Errorf("message text is required")
	}

	thread, err := s.store.GetAssistantThread(threadID)
	if err != nil {
		return nil, fmt.Errorf("assistant thread not found")
	}
	now := time.Now().UTC().Format(time.RFC3339)

	userMessage := &model.AssistantMessage{
		ID:        uuid.NewString(),
		ThreadID:  thread.ID,
		Role:      model.AssistantMessageRoleUser,
		Content:   trimmed,
		Context:   contextToMap(assistantContext),
		CreatedAt: now,
	}
	s.store.AppendAssistantMessage(userMessage)

	tools := mcp.NewRegistry(s)
	githubConnected := s.GitHubAccessToken() != ""
	githubLogin := ""
	if githubConnected {
		if status, err := s.store.ConnectionStatus("github"); err == nil && status.Username != nil {
			githubLogin = strings.TrimSpace(*status.Username)
		}
	}
	knowledge := s.store.ListKnowledgeEntries(false)
	var turn *llm.AgentTurn
	if sink != nil {
		sink = wrapResumePatchSink(s, sink)
		turn, err = s.llm.RunAgentStream(ctx, trimmed, assistantContext, s.store.ListAssistantMessages(thread.ID, 20), attachments, llm.FormatTwinContext(s.store.ListTwinEntries()), githubConnected, githubLogin, tools, knowledge, sink)
	} else {
		turn, err = s.llm.RunAgent(ctx, trimmed, assistantContext, s.store.ListAssistantMessages(thread.ID, 20), attachments, llm.FormatTwinContext(s.store.ListTwinEntries()), githubConnected, githubLogin, tools, knowledge)
	}
	if err != nil {
		if errors.Is(err, llm.ErrMissingAPIKey) {
			return nil, err
		}
		return nil, fmt.Errorf("run cv agent: %w", err)
	}

	messageID := uuid.NewString()
	actionLogs := make([]*model.AssistantActionLog, 0, len(turn.Executions))
	affectedResumeIDs := map[string]struct{}{}
	affectedPortfolioIDs := map[string]struct{}{}

	for _, exec := range turn.Executions {
		logEntry := executionToActionLog(messageID, exec)
		actionLogs = append(actionLogs, logEntry)
		for _, rid := range exec.AffectedResumeIDs {
			affectedResumeIDs[rid] = struct{}{}
		}
		for _, pid := range exec.AffectedPortfolioIDs {
			affectedPortfolioIDs[pid] = struct{}{}
		}
		s.store.AppendActionLog(logEntry)
	}

	assistantMessage := &model.AssistantMessage{
		ID:        messageID,
		ThreadID:  thread.ID,
		Role:      model.AssistantMessageRoleAssistant,
		Content:   turn.Reply,
		Context:   contextToMap(assistantContext),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.store.AppendAssistantMessage(assistantMessage)

	affected := make([]string, 0, len(affectedResumeIDs))
	for rid := range affectedResumeIDs {
		affected = append(affected, rid)
	}

	affectedPortfolios := make([]string, 0, len(affectedPortfolioIDs))
	for pid := range affectedPortfolioIDs {
		affectedPortfolios = append(affectedPortfolios, pid)
	}

	var resumeWithContent *model.ResumeWithContent
	if assistantContext.ResumeID != nil {
		if content, err := s.store.ResumeWithContent(*assistantContext.ResumeID); err == nil {
			resumeWithContent = content
		}
	}
	if resumeWithContent == nil && len(affected) > 0 {
		if content, err := s.store.ResumeWithContent(affected[len(affected)-1]); err == nil {
			resumeWithContent = content
		}
	}

	var portfolioWithContent *model.PortfolioWithContent
	if assistantContext.PortfolioID != nil {
		if content, err := s.store.PortfolioWithContent(*assistantContext.PortfolioID); err == nil {
			portfolioWithContent = content
		}
	}
	if portfolioWithContent == nil && len(affectedPortfolios) > 0 {
		if content, err := s.store.PortfolioWithContent(affectedPortfolios[len(affectedPortfolios)-1]); err == nil {
			portfolioWithContent = content
		}
	}

	return &model.AssistantTurnResult{
		Messages:             s.store.ListAssistantMessages(thread.ID, 50),
		ActionLogs:           actionLogs,
		AffectedResumeIds:    affected,
		AffectedPortfolioIds: affectedPortfolios,
		ResumeWithContent:    resumeWithContent,
		PortfolioWithContent: portfolioWithContent,
	}, nil
}

func executionToActionLog(messageID string, exec mcp.Execution) *model.AssistantActionLog {
	now := time.Now().UTC().Format(time.RFC3339)
	logEntry := &model.AssistantActionLog{
		ID:        uuid.NewString(),
		MessageID: messageID,
		Op:        exec.Tool,
		Payload:   mcp.BuildActionLogPayload(exec),
		Success:   exec.Error == "",
		CreatedAt: now,
	}
	if exec.Error != "" {
		msg := exec.Error
		logEntry.Error = &msg
	}
	return logEntry
}

func contextToMap(input model.AssistantContextInput) map[string]any {
	m := map[string]any{"view": string(input.View)}
	if input.ResumeID != nil {
		m["resumeId"] = *input.ResumeID
	}
	if input.PortfolioID != nil {
		m["portfolioId"] = *input.PortfolioID
	}
	if input.SectionID != nil {
		m["sectionId"] = *input.SectionID
	}
	if input.SectionItemID != nil {
		m["sectionItemId"] = *input.SectionItemID
	}
	if input.JobID != nil {
		m["jobId"] = *input.JobID
	}
	return m
}

func NotFound(err error) bool {
	return errors.Is(err, store.ErrNotFound)
}

func (s *Service) GitHubAccessToken() string {
	return s.store.GitHubAccessToken()
}

func (s *Service) UserEmail() string {
	if u := s.store.User(); u != nil {
		return strings.TrimSpace(u.Email)
	}
	return ""
}

func (s *Service) ConnectionStatus(provider model.ConnectionProvider) (*model.ConnectionStatus, error) {
	return s.store.ConnectionStatus(strings.ToLower(string(provider)))
}

func (s *Service) DisconnectConnection(provider model.ConnectionProvider) (bool, error) {
	return s.store.DisconnectConnection(strings.ToLower(string(provider)))
}
