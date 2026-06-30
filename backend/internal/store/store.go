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
	UpdateResumeSectionDisplayTitle(resumeID, sectionID string, displayTitle *string) (*model.ResumeWithContent, error)
	ReorderResumeSections(resumeID string, sectionIDs []string) (*model.ResumeWithContent, error)
	UpdateResumeSectionVisibility(resumeID, sectionID string, showInPreview bool) (*model.ResumeWithContent, error)
	UpdateResumeSectionItemVisibility(resumeID, sectionID, sectionItemID string, showInPreview bool) (*model.ResumeWithContent, error)
	AddResumeSectionItem(resumeID, sectionID, headline, body string, metadata map[string]any) (*model.ResumeWithContent, error)
	UpdateResumeSectionItem(resumeID, sectionID, sectionItemID string, headline, body *string, metadata map[string]any) (*model.ResumeWithContent, error)
	DeleteSectionItem(sectionItemID string) error
	UpdateContactProfile(resumeID string, fullName, headline, email, phone, location, website, linkedIn, github, photoURL, linkedinPhotoURL, githubPhotoURL *string) (*model.ResumeWithContent, error)
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
	ListPortfolios() []*model.Portfolio
	GetPortfolio(id string) (*model.Portfolio, error)
	SavePortfolio(portfolio *model.Portfolio)
	GetPortfolioSettings(portfolioID string) *model.PortfolioSettings
	UpdatePortfolioSettings(portfolioID string, update func(*model.PortfolioSettings)) (*model.PortfolioSettings, error)
	UpdatePortfolioContactProfile(portfolioID string, fullName, headline, email, phone, location, website, linkedIn, github, photoURL, linkedinPhotoURL, githubPhotoURL, ogImageURL, faviconURL *string) (*model.PortfolioWithContent, error)
	PortfolioWithContent(portfolioID string) (*model.PortfolioWithContent, error)
	AddPortfolioProject(input model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioProject(input model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error)
	DeletePortfolioProject(portfolioID, projectID string) (*model.PortfolioWithContent, error)
	SetPortfolioProjectVisibility(portfolioID, projectID string, showInPreview bool) (*model.PortfolioWithContent, error)
	AddPortfolioSkill(input model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioSkill(input model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error)
	DeletePortfolioSkill(portfolioID, skillID string) (*model.PortfolioWithContent, error)
	AddPortfolioTestimonial(input model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioTestimonial(input model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error)
	DeletePortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioWithContent, error)
	DuplicatePortfolio(sourceID string) (*model.Portfolio, error)
	DeletePortfolio(id string) error
	CreatePortfolio(title string) *model.Portfolio
	SetUsername(userID, username string) (*model.User, error)
	SetPortfolioSlug(userID, portfolioID, slug string) (*model.Portfolio, error)
	PublicPortfolioWithContent(username string, slug *string) (*model.PortfolioWithContent, error)
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
	ListKnowledgeEntries(includeDisabled bool) []*model.KnowledgeEntry
	GetKnowledgeEntry(id string) (*model.KnowledgeEntry, error)
	CreateKnowledgeEntry(entry *model.KnowledgeEntry) (*model.KnowledgeEntry, error)
	UpdateKnowledgeEntry(id string, update func(*model.KnowledgeEntry) error) (*model.KnowledgeEntry, error)
	DeleteKnowledgeEntry(id string) error
}

var (
	_ Store = (*Postgres)(nil)
)
