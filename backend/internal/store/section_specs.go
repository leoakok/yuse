package store

import "github.com/leo/ai-weekend/backend/graph/model"

type workspaceSectionSpec struct {
	sectionType model.SectionType
	title       string
	onResume    bool
}

func allWorkspaceSectionSpecs() []workspaceSectionSpec {
	return []workspaceSectionSpec{
		{model.SectionTypeSummary, "Summary", true},
		{model.SectionTypeExperience, "Work Experience", true},
		{model.SectionTypeEducation, "Education", true},
		{model.SectionTypeSkills, "Skills", true},
		{model.SectionTypeLanguages, "Languages", true},
		{model.SectionTypeProjects, "Projects", true},
		{model.SectionTypeCertifications, "Certifications", false},
		{model.SectionTypeOrganizations, "Organizations", false},
		{model.SectionTypePublications, "Publications", false},
		{model.SectionTypeAwards, "Awards", false},
		{model.SectionTypeVolunteer, "Volunteer", false},
		{model.SectionTypeCustom, "Custom", false},
	}
}

func resumeDefaultSectionSpecs() []workspaceSectionSpec {
	out := make([]workspaceSectionSpec, 0)
	for _, spec := range allWorkspaceSectionSpecs() {
		if spec.onResume {
			out = append(out, spec)
		}
	}
	return out
}
