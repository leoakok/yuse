package mcp

import (
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/sectionmeta"
)

type toolDef struct {
	Name        string
	Description string
	Parameters  map[string]any
}

func sectionTypeEnum() map[string]any {
	return enumProp("Resume section type", model.AllSectionType...)
}

func twinEntryTypeEnum() map[string]any {
	return enumProp("Digital Twin entry category", model.AllTwinEntryType...)
}

func jobStatusEnum() map[string]any {
	return enumProp("Application pipeline stage", model.AllJobStatus...)
}

func pageFormatEnum() map[string]any {
	return enumProp("Paper size", model.AllPageFormat...)
}

func fontSizeEnum() map[string]any {
	return enumProp("Body text size", model.AllFontSize...)
}

func toolDefinitions() []toolDef {
	object := func(props map[string]any, required ...string) map[string]any {
		schema := map[string]any{
			"type":       "object",
			"properties": props,
		}
		if len(required) > 0 {
			schema["required"] = required
		}
		return schema
	}
	str := func(desc string, examples ...string) map[string]any {
		p := map[string]any{"type": "string", "description": desc}
		if len(examples) > 0 {
			p["examples"] = examples
		}
		return p
	}
	boolProp := func(desc string) map[string]any {
		return map[string]any{"type": "boolean", "description": desc}
	}
	intProp := func(desc string, min, max int) map[string]any {
		p := map[string]any{"type": "integer", "description": desc}
		if min > 0 {
			p["minimum"] = min
		}
		if max > 0 {
			p["maximum"] = max
		}
		return p
	}
	dateStr := func(desc string) map[string]any {
		return str(desc+" Format: YYYY-MM or YYYY; use Present for ongoing.", "2022-06", "2019", "Present")
	}
	urlStr := func(desc string) map[string]any {
		return str(desc, "https://example.com/about")
	}
	legacyMeta := map[string]any{
		"type":                 "object",
		"description":          "Deprecated — use explicit fields (company, institution, location, startDate, endDate, url, level). Still accepted.",
		"additionalProperties": true,
	}
	sectionItemFields := map[string]any{
		"headline": str(
			"Item title — meaning depends on section type (see add_section_item description). EXPERIENCE=job title only; EDUCATION=degree only; SKILLS/LANGUAGES=one name; PROJECTS=project name. Never the section title. Never comma-list multiple skills/languages.",
			"Senior Software Engineer",
			"Bachelor of Science in Computer Science",
			"TypeScript",
			"English",
		),
		"body": str(
			"Item content — meaning depends on section type. EXPERIENCE=achievement bullets ONLY (no company/dates/location). SUMMARY=paragraph. SKILLS/LANGUAGES=optional notes only. PROJECTS=description/impact. Do NOT dump metadata here.",
			"- Led platform migration serving 2M users\n- Reduced API latency 40%",
		),
		"company": str(
			"Employer or org. REQUIRED for EXPERIENCE. Optional for PROJECTS (client/org). Do not put in body.",
			"Acme Corp",
		),
		"institution": str(
			"School or organization. REQUIRED for EDUCATION and VOLUNTEER. Do not put in headline or body.",
			"MIT",
		),
		"location": str(
			"City, region, or Remote. RECOMMENDED for EXPERIENCE. Do not put in body.",
			"San Francisco, CA",
			"Remote",
		),
		"startDate": dateStr("Start date for EXPERIENCE, EDUCATION, PROJECTS, PUBLICATIONS, AWARDS, VOLUNTEER."),
		"endDate": dateStr("End date. Use Present or endDatePresent=true for ongoing roles."),
		"endDatePresent": boolProp("When true, sets endDate to Present for ongoing EXPERIENCE or PROJECTS."),
		"url": urlStr("Link for PROJECTS, CERTIFICATIONS, PUBLICATIONS, ORGANIZATIONS — not in body."),
		"level": enumProp(
			"Proficiency — REQUIRED for SKILLS (BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT) and LANGUAGES (BEGINNER|INTERMEDIATE|PROFICIENT|FLUENT|NATIVE). One item per skill/language.",
			sectionmeta.AllProficiencyLevels...,
		),
		"metadata": legacyMeta,
	}
	contactProfileFields := map[string]any{
		"fullName": str("Legal or display name in the Profile header.", "Jane Doe"),
		"headline": str("Professional title under the name (not a section item).", "Staff Software Engineer"),
		"email":    str("Email address.", "jane@example.com"),
		"phone":    str("Phone number.", "+1 555 0100"),
		"location": str("City, region, or remote.", "Berlin, Germany"),
		"website":  urlStr("Personal or portfolio site."),
		"linkedIn": str("LinkedIn profile URL or handle.", "https://linkedin.com/in/janedoe"),
		"github":   str("GitHub profile URL or handle.", "https://github.com/janedoe"),
		"photoUrl": urlStr("Profile photo URL (HTTPS). Set via upload in the editor or a hosted image URL the user provides."),
	}

	return []toolDef{
		{
			Name:        "list_resumes",
			Description: "List all resumes (id and title).",
			Parameters:  object(map[string]any{}),
		},
		{
			Name:        "get_resume",
			Description: "Get resume metadata by id.",
			Parameters:  object(map[string]any{"id": str("Resume id.")}, "id"),
		},
		{
			Name:        "create_resume",
			Description: "Create a new empty resume.",
			Parameters:  object(map[string]any{"title": str("Resume title.", "Senior PM — Acme")}, "title"),
		},
		{
			Name:        "duplicate_resume",
			Description: "Clone a resume with all sections, items, and settings.",
			Parameters:  object(map[string]any{"id": str("Source resume id.")}, "id"),
		},
		{
			Name:        "delete_resume",
			Description: "Permanently delete a resume.",
			Parameters:  object(map[string]any{"id": str("Resume id.")}, "id"),
		},
		{
			Name:        "update_resume",
			Description: "Rename a resume.",
			Parameters: object(map[string]any{
				"id":    str("Resume id."),
				"title": str("New title.", "Staff Engineer CV"),
			}, "id"),
		},
		{
			Name:        "get_resume_content",
			Description: "Get resume for editing: contactProfile, sections with ids/types/items (flat metadata fields promoted), and structured fieldGuide per section (required, recommended, goodExample, badExample). Call before add_section_item or update_section_item to learn section ids and field rules.",
			Parameters:  object(map[string]any{"id": str("Resume id.")}, "id"),
		},
		{
			Name: "update_contact_profile",
			Description: `Update the Profile header block ONLY (name, title, contact, links, photo). NOT a section item.

WHEN TO USE: Setting fullName, professional headline, email, phone, location, website, linkedIn, github, photoUrl.
WHEN NOT: Work history, education, skills — those use add_section_item on their sections.

Returns fieldHints when key profile fields were omitted.`,
			Parameters: mergeProps(object(map[string]any{
				"resumeId": str("Resume id."),
			}, "resumeId"), contactProfileFields),
		},
		{
			Name:        "list_sections",
			Description: "List workspace sections; optionally filter by type.",
			Parameters: object(map[string]any{
				"type": sectionTypeEnum(),
			}),
		},
		{
			Name:        "add_section_item",
			Description: addSectionItemToolDescription(),
			Parameters: mergeProps(object(map[string]any{
				"resumeId":  str("Resume id."),
				"sectionId": str("Section id from list_sections or get_resume_content."),
			}, "resumeId", "sectionId"), sectionItemFields),
		},
		{
			Name:        "update_section_item",
			Description: updateSectionItemToolDescription(),
			Parameters: mergeProps(object(map[string]any{
				"resumeId":      str("Resume id."),
				"sectionId":     str("Section id."),
				"sectionItemId": str("Section item id."),
			}, "resumeId", "sectionId", "sectionItemId"), sectionItemFields),
		},
		{
			Name:        "set_item_visibility",
			Description: "Show or hide a section item in the resume preview.",
			Parameters: object(map[string]any{
				"resumeId":      str("Resume id."),
				"sectionId":     str("Section id."),
				"sectionItemId": str("Section item id."),
				"showInPreview": boolProp("true = visible in preview, false = hidden."),
			}, "resumeId", "sectionId", "sectionItemId", "showInPreview"),
		},
		{
			Name:        "update_resume_settings",
			Description: "Update resume design: page format, margins, font, theme, locale.",
			Parameters: object(map[string]any{
				"resumeId":           str("Resume id."),
				"pageFormat":         pageFormatEnum(),
				"fontSize":           fontSizeEnum(),
				"marginHorizontalMm": map[string]any{"type": "number", "description": "Horizontal page margin in millimeters."},
				"marginVerticalMm":   map[string]any{"type": "number", "description": "Vertical page margin in millimeters."},
				"themeId":            str("Theme id from list_cv_themes."),
				"showPhoto":          boolProp("Whether to show the profile photo in the CV preview (requires photoUrl on the contact profile)."),
				"locale":             str("BCP-47 locale.", "en-US"),
			}, "resumeId"),
		},
		{
			Name:        "list_cv_themes",
			Description: "List available CV themes.",
			Parameters:  object(map[string]any{}),
		},
		{
			Name:        "list_twin_entries",
			Description: "List Digital Twin career knowledge entries.",
			Parameters:  object(map[string]any{}),
		},
		{
			Name:        "get_twin_entry",
			Description: "Get one Digital Twin entry by id.",
			Parameters:  object(map[string]any{"id": str("Twin entry id.")}, "id"),
		},
		{
			Name: "create_twin_entry",
			Description: `Create a Digital Twin career knowledge entry — structured STAR/PAR, not tied to one resume.

WHEN TO USE: Persisting career stories, skills, projects from conversation or imports.
WHEN NOT: Direct CV edits (use add_section_item) unless also mirroring to Twin.

STAR (EXPERIENCE, EDUCATION): situation, task, action, result — fill all you know.
PAR (PROJECT, SKILL_AREA): problem, action, result.
Set storyFormat=STAR or PAR explicitly. Flat fields: company, institution, location, startDate, endDate, url, level.

Returns fieldHints and missingSTARorPAR for incomplete entries.`,
			Parameters: mergeProps(object(map[string]any{
				"type":  twinEntryTypeEnum(),
				"title": str("Short label: role, project, or skill area.", "Senior Engineer @ Acme — payments rewrite"),
			}, "type", "title"), map[string]any{
				"body": str(
					"Optional resume-ready summary bullets — synthesize from STAR/PAR fields, not a substitute for them.",
					"- Cut checkout latency 40% by rewriting the payments service in Go",
				),
				"storyFormat": enumProp("Story structure: STAR for jobs/education, PAR for projects/skills.", "STAR", "PAR"),
				"situation":   str("STAR REQUIRED for EXPERIENCE — context: team, company, constraints.", "Payments team at a 50-person startup, legacy Ruby monolith"),
				"task":        str("STAR REQUIRED for EXPERIENCE — your goal or responsibility.", "Own the checkout rewrite before holiday traffic"),
				"problem":     str("PAR REQUIRED for PROJECT/SKILL — the problem you tackled.", "Checkout p95 was 8s and losing conversions"),
				"action":      str("REQUIRED — what you specifically did: concrete steps, tech, decisions.", "Led design, migrated to Go microservices, rolled out behind feature flags"),
				"result":      str("REQUIRED — measurable outcome or impact.", "p95 dropped to 1.2s; conversion up 12%"),
				"company":     str("Employer (EXPERIENCE twin entries).", "Acme Corp"),
				"institution": str("School (EDUCATION twin entries).", "Stanford University"),
				"location":    str("Location for EXPERIENCE entries.", "Remote"),
				"startDate":   dateStr("Start date for EXPERIENCE/EDUCATION."),
				"endDate":     dateStr("End date."),
				"endDatePresent": boolProp("When true, sets endDate to Present for ongoing roles."),
				"url":         urlStr("Project link (PROJECT entries)."),
				"level": enumProp(
					"REQUIRED for SKILL_AREA (BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT).",
					sectionmeta.AllSkillLevels...,
				),
				"metadata": legacyMeta,
			}),
		},
		{
			Name: "update_twin_entry",
			Description: `Update a Digital Twin entry — merge new STAR/PAR fields incrementally. Same field rules as create_twin_entry.

Call after each user answer to fill gaps. Returns fieldHints and missingSTARorPAR.`,
			Parameters: mergeProps(object(map[string]any{
				"id": str("Twin entry id."),
			}, "id"), map[string]any{
				"type":           twinEntryTypeEnum(),
				"title":          str("New title."),
				"body":           str("Updated summary — prefer updating STAR/PAR fields instead."),
				"storyFormat":    enumProp("Story structure.", "STAR", "PAR"),
				"situation":      str("STAR — context."),
				"task":           str("STAR — goal or responsibility."),
				"problem":        str("PAR — problem."),
				"action":         str("What you did."),
				"result":         str("Outcome or impact."),
				"company":        str("Employer (EXPERIENCE)."),
				"institution":    str("School (EDUCATION)."),
				"location":       str("Location."),
				"startDate":      dateStr("Start date."),
				"endDate":        dateStr("End date."),
				"endDatePresent": boolProp("When true, sets endDate to Present."),
				"url":            urlStr("Project link."),
				"level": enumProp(
					"Proficiency for SKILL_AREA entries (BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT).",
					sectionmeta.AllSkillLevels...,
				),
				"metadata":  legacyMeta,
				"sortOrder": intProp("Display order (lower first).", 0, 0),
			}),
		},
		{
			Name:        "delete_twin_entry",
			Description: "Delete a Digital Twin entry.",
			Parameters:  object(map[string]any{"id": str("Twin entry id.")}, "id"),
		},
		{
			Name:        "list_tracked_jobs",
			Description: "List tracked job applications (id, title, company, status, url, resumeId).",
			Parameters:  object(map[string]any{}),
		},
		{
			Name:        "get_tracked_job",
			Description: "Get one tracked job by id, including cover letter.",
			Parameters:  object(map[string]any{"id": str("Tracked job id.")}, "id"),
		},
		{
			Name: "update_tracked_job",
			Description: `Update a tracked job application after tailoring a CV or writing a cover letter.

WHEN TO USE: Finishing Job Tracker workflow — link tailored resumeId, save coverLetter, update status.
REQUIRED for completion: resumeId + non-empty coverLetter when user asked to track/tailor.

Set title, company, status (SAVED|APPLIED|INTERVIEW|OFFER|REJECTED|WITHDRAWN), location, source, salary, remote.`,
			Parameters: object(map[string]any{
				"id":          str("Tracked job id."),
				"title":       str("Role title.", "Senior Software Engineer"),
				"company":     str("Company name.", "Acme Corp"),
				"status":      jobStatusEnum(),
				"notes":       str("Private notes."),
				"resumeId":    str("Linked tailored resume id."),
				"coverLetter": str("Full cover letter text to store on the application."),
				"location":    str("Job location from posting.", "San Francisco, CA (hybrid)"),
				"source":      str("Where the posting was found.", "LinkedIn"),
				"salary":      str("Salary or range if known.", "$180k–$220k"),
				"remote":      boolProp("true if remote or hybrid remote."),
				"metadata":    legacyMeta,
			}, "id"),
		},
		{
			Name:        "web_search",
			Description: "Search the public web (DuckDuckGo). Use for company info, job postings, or public career facts. NOT for LinkedIn /in/ profiles (use fetch_linkedin_profile) or GitHub repos (use search_github/explore_website).",
			Parameters: object(map[string]any{
				"query": str("Search query.", "Acme Corp senior engineer job description"),
			}, "query"),
		},
		{
			Name:        "fetch_url",
			Description: "Fetch and extract text from ONE public web page (job posting, about page). GitHub profile/repo URLs use GitHub API automatically. LinkedIn /in/ profiles redirect to fetch_linkedin_profile logic. For multi-page exploration use explore_website instead.",
			Parameters: object(map[string]any{
				"url": urlStr("Public https URL to fetch."),
			}, "url"),
		},
		{
			Name:        "explore_website",
			Description: "PRIMARY web import tool. Explore any public URL and extract career data. Auto-picks strategy: GitHub/GitLab API for code profiles, deep crawl for portfolios. Returns importItems for batch twin/CV import, profile hints, page text. Use when user shares a portfolio, GitHub, GitLab, or personal site URL. NOT for LinkedIn /in/ (use fetch_linkedin_profile).",
			Parameters: object(map[string]any{
				"url":      urlStr("Public https URL (portfolio, GitHub, GitLab, personal site, etc.)."),
				"maxPages": intProp("Max pages to crawl for generic sites (1–12, default 10).", 1, 12),
				"maxItems": intProp("Max projects/items to return (1–15, default 8).", 1, 15),
			}, "url"),
		},
		{
			Name:        "crawl_site",
			Description: "Lower-level multi-page crawl for portfolio sites. Prefer explore_website — it picks smarter strategies and returns structured importItems. Do NOT use for GitHub profiles.",
			Parameters: object(map[string]any{
				"url":      urlStr("Site base URL."),
				"maxPages": intProp("Max pages to fetch (1–12, default 10).", 1, 12),
			}, "url"),
		},
		{
			Name:        "crawl_github_profile",
			Description: "Lower-level GitHub profile crawl. Prefer explore_website — same data plus unified importItems format.",
			Parameters: object(map[string]any{
				"url":      urlStr("GitHub profile URL (e.g. https://github.com/leoakok)."),
				"maxRepos": intProp("Max individual repos to fetch in detail (1–10, default 5).", 1, 10),
			}, "url"),
		},
		{
			Name: "search_github",
			Description: "Search or list GitHub repositories. When GitHub is connected, set listUserRepos=true to search ALL of the signed-in user's repos (paginated, includes private). Use query to filter by name, description, or topics (case-insensitive, partial/fuzzy match). Omit query to list top repos. Without listUserRepos, searches public GitHub globally. Prefer this over web_search for the user's own GitHub projects.",
			Parameters: object(map[string]any{
				"query":         str("Filter terms matched against repo name, full_name, description, and topics (partial, case-insensitive). Omit or \"\" with listUserRepos true to list top repos.", "stylette", "typescript portfolio"),
				"listUserRepos": boolProp("When true and GitHub is connected, fetch all user repos then filter client-side (includes private repos). Defaults to true when GitHub is connected."),
				"maxResults":    intProp("Max matching repositories to return (1–30, default 10).", 1, 30),
			}),
		},
		{
			Name:        "fetch_linkedin_profile",
			Description: "PRIMARY LinkedIn import tool. Fetch a full LinkedIn profile from a public /in/ URL. Use BEFORE fetch_url or web_search when user shares LinkedIn. Returns structured profile text and importItems for Twin/CV batch import.",
			Parameters: object(map[string]any{
				"profileUrl": str("LinkedIn profile URL (linkedin.com/in/…).", "https://www.linkedin.com/in/janedoe"),
				"email":      str("Email for the profile lookup; defaults to the signed-in user's email when omitted."),
			}, "profileUrl"),
		},
	}
}

func enumProp[T ~string](desc string, values ...T) map[string]any {
	enum := make([]string, len(values))
	for i, v := range values {
		enum[i] = string(v)
	}
	return map[string]any{
		"type":        "string",
		"description": desc,
		"enum":        enum,
	}
}

func mergeProps(base map[string]any, extra map[string]any) map[string]any {
	props := base["properties"].(map[string]any)
	for k, v := range extra {
		props[k] = v
	}
	return base
}
