package mcp

import (
	"github.com/leo/ai-weekend/backend/graph/model"
)

// sectionFieldSpec describes how agents should populate one section type.
type sectionFieldSpec struct {
	Required    []string
	Recommended []string
	Fields      map[string]string
	GoodExample map[string]string
	BadExample  map[string]string
	Notes       []string
}

var sectionFieldSpecs = map[model.SectionType]sectionFieldSpec{
	model.SectionTypeExperience: {
		Required:    []string{"headline", "company", "startDate"},
		Recommended: []string{"location", "endDate", "body"},
		Fields: map[string]string{
			"headline":  "Job title only — not employer, not dates",
			"company":   "Employer name",
			"location":  "City, region, or Remote",
			"startDate": "YYYY-MM or YYYY",
			"endDate":   "YYYY-MM, YYYY, or Present (or set endDatePresent=true)",
			"body":      "Achievement bullets ONLY — STAR outcomes, no company/dates/location",
		},
		GoodExample: map[string]string{
			"headline":  "Senior Software Engineer",
			"company":   "Acme Corp",
			"location":  "San Francisco, CA",
			"startDate": "2020-06",
			"endDate":   "2023-12",
			"body":      "- Led checkout rewrite; cut p95 latency 40%\n- Mentored 4 engineers",
		},
		BadExample: map[string]string{
			"headline": "Senior Engineer at Acme Corp (2020-2023)",
			"body":     "Acme Corp, San Francisco\n2020-2023\n- Built APIs",
		},
		Notes: []string{
			"Never put employer, location, or dates in body — use company, location, startDate, endDate",
			"One item per job — call add_section_item separately for each role",
		},
	},
	model.SectionTypeEducation: {
		Required:    []string{"headline", "institution"},
		Recommended: []string{"startDate", "endDate", "body"},
		Fields: map[string]string{
			"headline":    "Degree or program only — not school name",
			"institution": "School or university",
			"startDate":   "Start year (YYYY)",
			"endDate":     "Graduation year (YYYY)",
			"body":        "Optional honors, coursework, GPA",
		},
		GoodExample: map[string]string{
			"headline":    "Bachelor of Science in Computer Science",
			"institution": "MIT",
			"startDate":   "2016",
			"endDate":     "2020",
		},
		BadExample: map[string]string{
			"headline": "Education",
			"body":     "BS CS — MIT (2016-2020)",
		},
		Notes: []string{
			"Split degree and school — headline=degree, institution=school",
			"One item per degree",
		},
	},
	model.SectionTypeSkills: {
		Required:    []string{"headline", "level"},
		Recommended: []string{},
		Fields: map[string]string{
			"headline": "One skill name only",
			"level":    "BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT",
			"body":     "Optional context — never a comma-separated skill list",
		},
		GoodExample: map[string]string{
			"headline": "TypeScript",
			"level":    "ADVANCED",
		},
		BadExample: map[string]string{
			"headline": "TypeScript, Go, React",
			"body":     "Python, Java, C++",
		},
		Notes: []string{
			"One add_section_item call per skill",
			"Programming languages belong here — not LANGUAGES",
		},
	},
	model.SectionTypeLanguages: {
		Required:    []string{"headline", "level"},
		Recommended: []string{},
		Fields: map[string]string{
			"headline": "One spoken language only",
			"level":    "BEGINNER|INTERMEDIATE|PROFICIENT|FLUENT|NATIVE",
			"body":     "Optional notes — never multiple languages",
		},
		GoodExample: map[string]string{
			"headline": "English",
			"level":    "NATIVE",
		},
		BadExample: map[string]string{
			"headline": "English, German, French",
		},
		Notes: []string{"One add_section_item call per spoken language"},
	},
	model.SectionTypeProjects: {
		Required:    []string{"headline"},
		Recommended: []string{"url", "company", "startDate", "endDate", "body"},
		Fields: map[string]string{
			"headline":  "Project name",
			"company":   "Org, employer, or personal",
			"url":       "Repo or demo link",
			"startDate": "YYYY-MM or YYYY",
			"endDate":   "YYYY-MM, YYYY, or Present",
			"body":      "Problem solved, tech stack, impact — not just a URL",
		},
		GoodExample: map[string]string{
			"headline": "Payments microservice",
			"url":      "https://github.com/user/payments",
			"body":     "Rewrote checkout in Go; cut p95 latency 40%",
		},
		BadExample: map[string]string{
			"body": "https://github.com/user/payments — built in 2022 at Acme",
		},
		Notes: []string{"Put links in url, dates in startDate/endDate"},
	},
	model.SectionTypeCertifications: {
		Required:    []string{"headline"},
		Recommended: []string{"url", "startDate", "body"},
		Fields: map[string]string{
			"headline":  "Certification name",
			"url":       "Verification link",
			"startDate": "Year earned (YYYY)",
			"body":      "Issuer or credential ID",
		},
		GoodExample: map[string]string{
			"headline":  "AWS Solutions Architect",
			"startDate": "2023",
			"body":      "Amazon Web Services",
		},
	},
	model.SectionTypeSummary: {
		Required:    []string{"body"},
		Recommended: []string{"headline"},
		Fields: map[string]string{
			"headline": "Short label (e.g. Professional summary)",
			"body":     "Summary paragraph tailored to the role",
		},
		GoodExample: map[string]string{
			"headline": "Professional summary",
			"body":     "Staff engineer with 10+ years building payments platforms…",
		},
		BadExample: map[string]string{
			"headline": "Summary",
			"body":     "",
		},
	},
	model.SectionTypeOrganizations: {
		Required:    []string{"headline"},
		Recommended: []string{"url", "body"},
		Fields: map[string]string{
			"headline": "Organization name",
			"url":      "Chapter or group link",
			"body":     "Role or involvement",
		},
	},
	model.SectionTypePublications: {
		Required:    []string{"headline"},
		Recommended: []string{"url", "startDate", "body"},
		Fields: map[string]string{
			"headline":  "Publication title",
			"url":       "DOI or paper link",
			"startDate": "Year published",
			"body":      "Venue or co-authors",
		},
	},
	model.SectionTypeAwards: {
		Required:    []string{"headline"},
		Recommended: []string{"startDate", "body"},
		Fields: map[string]string{
			"headline":  "Award name",
			"startDate": "Year received",
			"body":      "Issuer or context",
		},
	},
	model.SectionTypeVolunteer: {
		Required:    []string{"headline", "institution"},
		Recommended: []string{"startDate", "endDate", "body"},
		Fields: map[string]string{
			"headline":    "Role or program",
			"institution": "Organization",
			"startDate":   "YYYY-MM or YYYY",
			"endDate":     "YYYY-MM or YYYY",
			"body":        "Impact or responsibilities",
		},
	},
	model.SectionTypeCustom: {
		Required:    []string{"headline"},
		Recommended: []string{"body"},
		Fields: map[string]string{
			"headline": "Item title",
			"body":     "Details",
		},
	},
}

func sectionFieldSpecFor(sectionType model.SectionType) sectionFieldSpec {
	if spec, ok := sectionFieldSpecs[sectionType]; ok {
		return spec
	}
	return sectionFieldSpecs[model.SectionTypeCustom]
}

func sectionItemFieldGuideObject(sectionType model.SectionType) map[string]any {
	spec := sectionFieldSpecFor(sectionType)
	out := map[string]any{
		"sectionType": string(sectionType),
		"required":    spec.Required,
		"recommended": spec.Recommended,
		"fields":      spec.Fields,
		"summary":     sectionItemFieldGuideSummary(sectionType),
	}
	if len(spec.GoodExample) > 0 {
		out["goodExample"] = spec.GoodExample
	}
	if len(spec.BadExample) > 0 {
		out["badExample"] = spec.BadExample
	}
	if len(spec.Notes) > 0 {
		out["notes"] = spec.Notes
	}
	return out
}

func sectionItemFieldGuideSummary(sectionType model.SectionType) string {
	return sectionItemFieldGuide(sectionType)
}

func addSectionItemToolDescription() string {
	return `Add ONE item to a resume section. Call once per job, degree, skill, language, or project.

WHEN TO USE: Populating or extending a section after get_resume_content / list_sections.
WHEN NOT: Profile header (use update_contact_profile). Batch imports still need one call per item.

Per-section rules (use flat fields — merged into metadata automatically):
• EXPERIENCE — REQUIRED: headline=job title, company, startDate. RECOMMENDED: location, endDate, body=bullets ONLY.
  GOOD: headline="Senior Engineer", company="Acme", location="Remote", startDate="2020-06", endDate="Present", body="- Led migration…"
  BAD: body="Acme Corp, 2020-2023, San Francisco\n- Built APIs" (put company/location/dates in their fields)
• EDUCATION — REQUIRED: headline=degree, institution. RECOMMENDED: startDate, endDate.
• SKILLS — REQUIRED: headline=one skill, level enum. One call per skill — never comma-list.
• LANGUAGES — REQUIRED: headline=one language, level enum. Spoken languages only.
• PROJECTS — REQUIRED: headline. RECOMMENDED: url, company, dates, body=description.
• SUMMARY — REQUIRED: body paragraph.

get_resume_content returns fieldGuide per section with goodExample/badExample.`
}

func updateSectionItemToolDescription() string {
	return `Update an existing section item by id. Same field rules as add_section_item — use structured flat fields (company, institution, location, startDate, endDate, level, url), not a metadata dump in body.

Only send fields you want to change. EXPERIENCE: keep achievement bullets in body; employer and dates in company/location/startDate/endDate.

Returns fieldHints when structured fields are missing or body still contains metadata that belongs elsewhere.`
}
