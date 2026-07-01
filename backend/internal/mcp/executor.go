package mcp

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// Executor is the CV platform API surface exposed to MCP tools and the LLM agent.
// Implemented by cv.Service to avoid import cycles.
type Executor interface {
	ListResumes() []*model.Resume
	GetResume(id string) (*model.Resume, error)
	CreateResume(title string) *model.Resume
	DuplicateResume(id string) (*model.Resume, error)
	DeleteResume(id string) (bool, error)
	UpdateResume(id string, title *string, contactProfileID *string) (*model.Resume, error)
	GetResumeWithContent(id string) (*model.ResumeWithContent, error)
	UpdateContactProfile(ctx context.Context, input model.UpdateContactProfileInput) (*model.ResumeWithContent, error)
	AddResumeSectionItem(input model.AddResumeSectionItemInput) (*model.ResumeWithContent, error)
	UpdateResumeSectionItem(input model.UpdateResumeSectionItemInput) (*model.ResumeWithContent, error)
	UpdateResumeSectionItemVisibility(input model.UpdateResumeSectionItemVisibilityInput) (*model.ResumeWithContent, error)
	UpdateResumeSectionDisplayTitle(input model.UpdateResumeSectionDisplayTitleInput) (*model.ResumeWithContent, error)
	ReorderResumeSections(input model.ReorderResumeSectionsInput) (*model.ResumeWithContent, error)
	UpdateResumeSectionVisibility(input model.UpdateResumeSectionVisibilityInput) (*model.ResumeWithContent, error)
	DeleteSectionItem(resumeID, sectionItemID string) (*model.ResumeWithContent, error)
	UpdateResumeSettings(input model.UpdateResumeSettingsInput) (*model.ResumeSettings, error)
	ListPortfolios() []*model.Portfolio
	GetPortfolio(id string) (*model.Portfolio, error)
	CreatePortfolio(title string) *model.Portfolio
	DuplicatePortfolio(id string) (*model.Portfolio, error)
	DeletePortfolio(id string) (bool, error)
	UpdatePortfolio(id string, title, tagline, about *string, contactProfileID *string) (*model.Portfolio, error)
	GetPortfolioWithContent(id string) (*model.PortfolioWithContent, error)
	UpdatePortfolioContactProfile(ctx context.Context, input model.UpdatePortfolioContactProfileInput) (*model.PortfolioWithContent, error)
	AddPortfolioProject(input model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioProject(input model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error)
	DeletePortfolioProject(portfolioID, projectID string) (*model.PortfolioWithContent, error)
	SetPortfolioProjectVisibility(input model.SetPortfolioProjectVisibilityInput) (*model.PortfolioWithContent, error)
	AddPortfolioSkill(input model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioSkill(input model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error)
	DeletePortfolioSkill(portfolioID, skillID string) (*model.PortfolioWithContent, error)
	AddPortfolioTestimonial(input model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error)
	UpdatePortfolioTestimonial(input model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error)
	DeletePortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioWithContent, error)
	UpdatePortfolioSettings(input model.UpdatePortfolioSettingsInput) (*model.PortfolioSettings, error)
	ListSections(sectionType *model.SectionType) []*model.Section
	ListCvThemes() []*model.CvTheme
	ListTwinEntries() []*model.TwinEntry
	GetTwinEntry(id string) (*model.TwinEntry, error)
	CreateTwinEntry(input model.CreateTwinEntryInput) (*model.TwinEntry, error)
	UpdateTwinEntry(input model.UpdateTwinEntryInput) (*model.TwinEntry, error)
	DeleteTwinEntry(id string) (bool, error)
	ListTrackedJobs() []*model.TrackedJob
	GetTrackedJob(id string) (*model.TrackedJob, error)
	CreateTrackedJob(url string) (*model.TrackedJob, error)
	UpdateTrackedJob(input model.UpdateTrackedJobInput) (*model.TrackedJob, error)
	DeleteTrackedJob(id string) (bool, error)
	GitHubAccessToken() string
	UserEmail() string
}
