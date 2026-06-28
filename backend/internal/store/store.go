package store

import (
	"github.com/leo/ai-weekend/backend/graph/model"
)

// Store is the persistence contract used by cv.Service.
type Store interface {
	User() *model.User
	Workspace() *model.Workspace
	Thread() *model.AssistantThread
	ListThemes() []*model.CvTheme
	GetTheme(id string) (*model.CvTheme, error)
	ListResumes() []*model.Resume
	GetResume(id string) (*model.Resume, error)
	SaveResume(resume *model.Resume)
	ListSections(sectionType *model.SectionType) []*model.Section
	GetSection(id string) (*model.Section, error)
	ListSectionItems(sectionType *model.SectionType) []*model.SectionItem
	GetSectionItem(id string) (*model.SectionItem, error)
	SaveSectionItem(item *model.SectionItem)
	ListContactProfiles() []*model.ContactProfile
	GetContactProfile(id string) (*model.ContactProfile, error)
	GetResumeSettings(resumeID string) *model.ResumeSettings
	UpdateResumeSettings(resumeID string, update func(*model.ResumeSettings)) (*model.ResumeSettings, error)
	UpdateResumeSectionItemVisibility(resumeID, sectionID, sectionItemID string, showInPreview bool) (*model.ResumeWithContent, error)
	AddResumeSectionItem(resumeID, sectionID, headline, body string, metadata map[string]any) (*model.ResumeWithContent, error)
	UpdateResumeSectionItem(resumeID, sectionID, sectionItemID string, headline, body *string, metadata map[string]any) (*model.ResumeWithContent, error)
	DeleteSectionItem(sectionItemID string) error
	UpdateContactProfile(resumeID string, fullName, headline, email, phone, location, website, linkedIn, github, photoURL *string) (*model.ResumeWithContent, error)
	ResumeWithContent(resumeID string) (*model.ResumeWithContent, error)
	SectionItemUsage(itemID string) (*model.SectionItemUsage, error)
	WorkspaceStats() *model.WorkspaceStats
	ResumesForSection(sectionID string) ([]*model.Resume, error)
	SectionItemsForSection(sectionID string) ([]*model.SectionItem, error)
	ListAssistantThreads() []*model.AssistantThread
	CreateAssistantThread() (*model.AssistantThread, error)
	GetAssistantThread(id string) (*model.AssistantThread, error)
	DeleteAssistantThread(id string) error
	ListAssistantMessages(threadID string, limit int) []*model.AssistantMessage
	AppendAssistantMessage(msg *model.AssistantMessage)
	AppendActionLog(log *model.AssistantActionLog)
	DuplicateResume(sourceID string) (*model.Resume, error)
	DeleteResume(id string) error
	CreateResume(title string) *model.Resume
	ListTwinEntries() []*model.TwinEntry
	GetTwinEntry(id string) (*model.TwinEntry, error)
	CreateTwinEntry(entry *model.TwinEntry) *model.TwinEntry
	UpdateTwinEntry(id string, update func(*model.TwinEntry) error) (*model.TwinEntry, error)
	DeleteTwinEntry(id string) error
	ListTrackedJobs() []*model.TrackedJob
	GetTrackedJob(id string) (*model.TrackedJob, error)
	CreateTrackedJob(job *model.TrackedJob) *model.TrackedJob
	UpdateTrackedJob(id string, update func(*model.TrackedJob) error) (*model.TrackedJob, error)
	DeleteTrackedJob(id string) error
	GitHubAccessToken() string
	ConnectionStatus(provider string) (*model.ConnectionStatus, error)
	DisconnectConnection(provider string) (bool, error)
}

var (
	_ Store = (*Postgres)(nil)
)
