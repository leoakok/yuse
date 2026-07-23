package cv

import (
	"time"

	"github.com/leo/ai-weekend/backend/graph/model"
)

const previewWorkspace = "design-preview"
const previewAt = "2026-01-01T00:00:00.000Z"

func strPtr(s string) *string { return &s }

// BuildDummyPreviewContent returns a ResumeWithContent with John Doe sample data
// and the given design settings and theme applied.
func BuildDummyPreviewContent(settings *model.ResumeSettings, theme *model.CvTheme) *model.ResumeWithContent {
	resumeID := "design-preview-resume"
	if settings != nil && settings.ResumeID != "" {
		resumeID = settings.ResumeID + "-preview"
	}
	settingsCopy := cloneResumeSettings(settings)
	if settingsCopy != nil {
		settingsCopy.ResumeID = resumeID
	}

	themeCopy := cloneTheme(theme)
	if themeCopy == nil {
		themeCopy = &model.CvTheme{
			ID:       "theme-modern",
			Name:     "Modern",
			Slug:     "modern",
			IsSystem: true,
			Config:   map[string]any{"fontFamily": "sans"},
		}
	}

	contact := &model.ContactProfile{
		ID:          "preview-john",
		WorkspaceID: previewWorkspace,
		FullName:    "John Doe",
		Headline:    strPtr("Marketing Director"),
		Email:       strPtr("john.doe@email.com"),
		Phone:       strPtr("+1 (212) 555-0198"),
		Location:    strPtr("New York, NY"),
		Website:     strPtr("johndoe.com"),
		LinkedIn:    strPtr("linkedin.com/in/johndoe"),
		CreatedAt:   previewAt,
		UpdatedAt:   previewAt,
	}

	sections := []*model.SectionWithItems{
		{
			Section: &model.Section{
				ID: "preview-summary", WorkspaceID: previewWorkspace, Type: model.SectionTypeSummary,
				Title: "Summary", CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
			},
			Items: []*model.SectionItem{{
				ID: "preview-summary-1", WorkspaceID: previewWorkspace, Type: model.SectionTypeSummary,
				Body: "Strategic marketing leader with 10 years driving brand growth, demand generation, and cross-functional launches for consumer and B2B companies.",
				ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
			}},
			ShowInPreview: true,
		},
		{
			Section: &model.Section{
				ID: "preview-exp", WorkspaceID: previewWorkspace, Type: model.SectionTypeExperience,
				Title: "Experience", CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
			},
			Items: []*model.SectionItem{
				{
					ID: "preview-exp-1", WorkspaceID: previewWorkspace, Type: model.SectionTypeExperience,
					Headline: "Marketing Director",
					Body: "Led integrated campaigns across brand, product marketing, and lifecycle.\n- Grew qualified pipeline 42% year over year.\n- Launched repositioning that lifted aided awareness 28 points.\n- Built a 12-person team across content, growth, and creative.",
					Metadata: map[string]any{"company": "Harbor & Co.", "startDate": "2020-01", "endDate": "", "location": "New York, NY"},
					ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
				},
				{
					ID: "preview-exp-2", WorkspaceID: previewWorkspace, Type: model.SectionTypeExperience,
					Headline: "Senior Marketing Manager",
					Body: "Owned go-to-market for two product lines from launch through scale.\n- Drove $4.2M in attributable revenue in year one.\n- Introduced marketing ops stack that cut reporting time 60%.",
					Metadata: map[string]any{"company": "Lumen Health", "startDate": "2016-04", "endDate": "2019-12", "location": "Boston, MA"},
					ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
				},
			},
			ShowInPreview: true,
		},
		{
			Section: &model.Section{
				ID: "preview-skills", WorkspaceID: previewWorkspace, Type: model.SectionTypeSkills,
				Title: "Skills", CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
			},
			Items: []*model.SectionItem{
				itemSkill("preview-skill-1", "Brand strategy", "EXPERT"),
				itemSkill("preview-skill-2", "Demand generation", "EXPERT"),
				itemSkill("preview-skill-3", "Product marketing", "ADVANCED"),
				itemSkill("preview-skill-4", "Content strategy", "ADVANCED"),
			},
			ShowInPreview: true,
		},
	}

	title := "Design preview"
	if settingsCopy != nil && settingsCopy.DesignPresetID.IsValid() {
		title = string(settingsCopy.DesignPresetID) + " preview"
	}

	return &model.ResumeWithContent{
		Resume: &model.Resume{
			ID: resumeID, WorkspaceID: previewWorkspace, Title: title,
			ContactProfileID: strPtr(contact.ID), CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
		},
		ContactProfile: contact,
		Settings:       settingsCopy,
		Theme:          themeCopy,
		Sections:       sections,
	}
}

func itemSkill(id, headline, level string) *model.SectionItem {
	return &model.SectionItem{
		ID: id, WorkspaceID: previewWorkspace, Type: model.SectionTypeSkills,
		Headline: headline, Metadata: map[string]any{"level": level},
		ShowInPreview: true, CreatedBy: "preview", CreatedAt: previewAt, UpdatedAt: previewAt,
	}
}

func cloneResumeSettings(s *model.ResumeSettings) *model.ResumeSettings {
	if s == nil {
		return nil
	}
	c := *s
	if s.ContactFields != nil {
		fields := make([]model.ContactField, len(s.ContactFields))
		copy(fields, s.ContactFields)
		c.ContactFields = fields
	}
	return &c
}

func cloneTheme(t *model.CvTheme) *model.CvTheme {
	if t == nil {
		return nil
	}
	c := *t
	if t.Config != nil {
		cfg := make(map[string]any, len(t.Config))
		for k, v := range t.Config {
			cfg[k] = v
		}
		c.Config = cfg
	}
	return &c
}

// MergeDesignIntoContent replaces settings and theme on content with design snapshots.
func MergeDesignIntoContent(content *model.ResumeWithContent, settings *model.ResumeSettings, theme *model.CvTheme) *model.ResumeWithContent {
	if content == nil {
		return BuildDummyPreviewContent(settings, theme)
	}
	out := *content
	if settings != nil {
		s := cloneResumeSettings(settings)
		s.ResumeID = content.Resume.ID
		out.Settings = s
	}
	if theme != nil {
		out.Theme = cloneTheme(theme)
	}
	return &out
}

// DesignPreviewAt is the fixed timestamp used in dummy preview fixtures.
func DesignPreviewAt() time.Time {
	t, _ := time.Parse(time.RFC3339, previewAt)
	return t
}
