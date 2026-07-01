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

func itemTitleLayoutEnum() map[string]any {
	return enumProp("Section item title layout: STACKED = title above subtitle, INLINE = same line", model.AllItemTitleLayout...)
}

func itemTitleSeparatorEnum() map[string]any {
	return enumProp("Separator between title and company when itemTitleLayout is INLINE", model.AllItemTitleSeparator...)
}

func itemTitleOrderEnum() map[string]any {
	return enumProp("Order of title and company when INLINE", model.AllItemTitleOrder...)
}

func fontFamilyEnum() map[string]any {
	return enumProp("Font family", model.AllFontFamily...)
}

func sectionDividerStyleEnum() map[string]any {
	return enumProp("Section heading underline style", model.AllSectionDividerStyle...)
}

func dateFormatEnum() map[string]any {
	return enumProp("Date display format", model.AllDateFormat...)
}

func datePositionEnum() map[string]any {
	return enumProp("Where dates appear on entries", model.AllDatePosition...)
}

func skillsLayoutEnum() map[string]any {
	return enumProp("Skills section layout", model.AllSkillsLayout...)
}

func columnLayoutEnum() map[string]any {
	return enumProp("Page column layout", model.AllColumnLayout...)
}

func sidebarPositionEnum() map[string]any {
	return enumProp("Sidebar side when columnLayout is TWO_COLUMN", model.AllSidebarPosition...)
}

func sidebarWidthEnum() map[string]any {
	return enumProp("Sidebar width when TWO_COLUMN", model.AllSidebarWidth...)
}

func designPresetEnum() map[string]any {
	return enumProp("Design theme preset (also sets themeId)", model.AllDesignPresetID...)
}

func photoPositionEnum() map[string]any {
	return enumProp("Profile photo placement", model.AllPhotoPosition...)
}

func photoSizeEnum() map[string]any {
	return enumProp("Profile photo size", model.AllPhotoSize...)
}

func contactLayoutEnum() map[string]any {
	return enumProp("Contact details layout in header", model.AllContactLayout...)
}

func contactFieldEnum() map[string]any {
	return enumProp("Contact field to show in header", model.AllContactField...)
}

func spacingDensityEnum() map[string]any {
	return enumProp("Spacing density", model.AllSpacingDensity...)
}

func descriptionStyleEnum() map[string]any {
	return enumProp("Entry body style", model.AllDescriptionStyle...)
}

func bulletCharEnum() map[string]any {
	return enumProp("Bullet character for lists", model.AllBulletChar...)
}

func itemTitleEmphasisEnum() map[string]any {
	return enumProp("Which part is emphasized in entry headers", model.AllItemTitleEmphasis...)
}

func locationDisplayEnum() map[string]any {
	return enumProp("How location appears on entries", model.AllLocationDisplay...)
}

func fontWeightRoleEnum() map[string]any {
	return enumProp("Font weight", model.AllFontWeightRole...)
}

func lineHeightEnum() map[string]any {
	return enumProp("Line height density", model.AllLineHeightDensity...)
}

func letterSpacingEnum() map[string]any {
	return enumProp("Heading letter spacing", model.AllLetterSpacingDensity...)
}

func sectionTitleCaseEnum() map[string]any {
	return enumProp("Section title capitalization", model.AllSectionTitleCase...)
}

func pageBackgroundEnum() map[string]any {
	return enumProp("Page background color preset", model.AllPageBackground...)
}

func skillsProficiencyEnum() map[string]any {
	return enumProp("Skills proficiency display style", model.AllSkillsProficiency...)
}

func languagesLayoutEnum() map[string]any {
	return enumProp("Languages section layout", model.AllLanguagesLayout...)
}

func certificationsLayoutEnum() map[string]any {
	return enumProp("Certifications section layout", model.AllCertificationsLayout...)
}

func footerStyleEnum() map[string]any {
	return enumProp("PDF footer style", model.AllFooterStyle...)
}

func resumeDesignExtensionProps(
	str func(desc string, examples ...string) map[string]any,
	boolProp func(desc string) map[string]any,
	intProp func(desc string, min, max int) map[string]any,
) map[string]any {
	return map[string]any{
		"sectionSpacing":         spacingDensityEnum(),
		"itemSpacing":            spacingDensityEnum(),
		"descriptionStyle":       descriptionStyleEnum(),
		"bulletChar":             bulletCharEnum(),
		"itemTitleEmphasis":      itemTitleEmphasisEnum(),
		"highlightCurrentRole":   boolProp("Emphasize the current role in experience entries."),
		"locationDisplay":        locationDisplayEnum(),
		"headingFontFamily":      fontFamilyEnum(),
		"bodyFontFamily":         fontFamilyEnum(),
		"nameFontWeight":         fontWeightRoleEnum(),
		"sectionTitleFontWeight": fontWeightRoleEnum(),
		"lineHeight":             lineHeightEnum(),
		"headingLetterSpacing":   letterSpacingEnum(),
		"sectionTitleCase":       sectionTitleCaseEnum(),
		"textPrimaryColor":       str("Primary text hex color.", "#111111"),
		"textMutedColor":         str("Muted text hex color.", "#666666"),
		"pageBackground":         pageBackgroundEnum(),
		"linkColor":              str("Link hex color.", "#2563eb"),
		"skillsProficiency":      skillsProficiencyEnum(),
		"languagesLayout":        languagesLayoutEnum(),
		"certificationsLayout":   certificationsLayoutEnum(),
		"keepSectionsTogether":   boolProp("Try to keep section blocks on one page when exporting."),
		"maxItemsBeforeBreak":    intProp("Max items in a section before a page break hint.", 1, 20),
		"footerStyle":            footerStyleEnum(),
		"exportFilenameTemplate": str("PDF export filename template.", "{name}-resume"),
	}
}

func portfolioLayoutEnum() map[string]any {
	return enumProp("Portfolio page layout", model.AllPortfolioLayout...)
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
		"description":          "Deprecated, use explicit fields (company, institution, location, startDate, endDate, url, level). Still accepted.",
		"additionalProperties": true,
	}
	sectionItemFields := map[string]any{
		"headline": str(
			"Item title, meaning depends on section type (see add_section_item description). EXPERIENCE=job title only; EDUCATION=degree only; SKILLS/LANGUAGES=one name; PROJECTS=project name. Never the section title. Never comma-list multiple skills/languages.",
			"Senior Software Engineer",
			"Bachelor of Science in Computer Science",
			"TypeScript",
			"English",
		),
		"body": str(
			"Item content, meaning depends on section type. EXPERIENCE=achievement bullets ONLY (no company/dates/location). SUMMARY=paragraph. SKILLS/LANGUAGES=optional notes only. PROJECTS=description/impact. Do NOT dump metadata here.",
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
		"url": urlStr("Link for PROJECTS, CERTIFICATIONS, PUBLICATIONS, ORGANIZATIONS, not in body."),
		"level": enumProp(
			"Proficiency, REQUIRED for SKILLS (BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT) and LANGUAGES (BEGINNER|INTERMEDIATE|PROFICIENT|FLUENT|NATIVE). One item per skill/language.",
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
		"photoUrl": urlStr("Uploaded profile photo URL (HTTPS). Only set when the user uploads a file in the editor, do not use for GitHub/LinkedIn avatars."),
		"linkedinPhotoUrl": urlStr("LinkedIn profile photo URL. Copy linkedinPhotoUrl from fetch_linkedin_profile (or explore_website on a LinkedIn /in/ URL) into update_contact_profile, do not upload to storage."),
		"githubPhotoUrl": urlStr("GitHub avatar URL. Copy githubPhotoUrl from explore_website, crawl_github_profile, or search_github (connected account) into update_contact_profile, do not upload to storage."),
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
			Description: "Create a new resume shell linked to workspace sections. Existing library items start hidden from preview. For role-target requests, run Role-targeted CV workflow first (Twin, research, fit), then populate with add_section_item before replying.",
			Parameters:  object(map[string]any{"title": str("Resume title.", "Forward Deployed Engineer")}, "title"),
		},
		{
			Name:        "duplicate_resume",
			Description: "Clone a resume with sections, item visibility, and settings. Prefer this as the base for role-target tailoring when a solid CV exists, then add_section_item for role-specific SUMMARY and new tailored experience/project items.",
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
			Description: "Get resume for editing: contactProfile, designSettings, sections with ids/types/items (flat metadata fields promoted), section showInPreview and displayTitle, and structured fieldGuide per section (required, recommended, goodExample, badExample). Call before add_section_item or update_section_item to learn section ids and field rules.",
			Parameters:  object(map[string]any{"id": str("Resume id.")}, "id"),
		},
		{
			Name: "update_contact_profile",
			Description: `Update the Profile header block ONLY (name, title, contact, links, photo). NOT a section item.

WHEN TO USE: Setting fullName, professional headline, email, phone, location, website, linkedIn, github, photoUrl, linkedinPhotoUrl, githubPhotoUrl.
Profile picture from GitHub/LinkedIn: fetch avatar via explore_website (GitHub URL), crawl_github_profile, fetch_linkedin_profile, or search_github (connected account), then set githubPhotoUrl or linkedinPhotoUrl here, not photoUrl.
WHEN NOT: Work history, education, skills, those use add_section_item on their sections.

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
			Name:        "reorder_resume_sections",
			Description: "Reorder resume sections in the preview. Pass sectionIds in the desired top-to-bottom order from get_resume_content.",
			Parameters: object(map[string]any{
				"resumeId": str("Resume id."),
				"sectionIds": map[string]any{
					"type":        "array",
					"description": "Ordered section ids.",
					"items":       map[string]any{"type": "string"},
				},
			}, "resumeId", "sectionIds"),
		},
		{
			Name:        "set_section_visibility",
			Description: "Show or hide an entire section on the resume preview (not individual items).",
			Parameters: object(map[string]any{
				"resumeId":      str("Resume id."),
				"sectionId":     str("Section id from get_resume_content."),
				"showInPreview": boolProp("true = section visible, false = hidden."),
			}, "resumeId", "sectionId", "showInPreview"),
		},
		{
			Name:        "update_section_display_title",
			Description: "Set a per-resume display name for a section heading. Omit displayTitle or pass empty string to reset to the default section title.",
			Parameters: object(map[string]any{
				"resumeId":     str("Resume id."),
				"sectionId":    str("Section id."),
				"displayTitle": str("Custom heading shown in preview.", "Selected Projects"),
			}, "resumeId", "sectionId"),
		},
		{
			Name:        "delete_section_item",
			Description: "Permanently delete a section item from the workspace library (removes it from all resumes).",
			Parameters: object(map[string]any{
				"resumeId":      str("Resume id."),
				"sectionItemId": str("Section item id."),
			}, "resumeId", "sectionItemId"),
		},
		{
			Name: "update_resume_settings",
			Description: `Update resume design and export settings. Matches the Design panel in the editor: theme preset, typography, margins, layout, dates, skills, ATS mode, spacing, and colors.

Call list_cv_themes for theme ids. Use designPresetId for bundled presets (MODERN, CLASSIC, etc.). get_resume_content returns designSettings for current values.

For ATS-friendly output set atsMode=true. For photo visibility also set showPhoto and optionally photoPosition/photoSize.`,
			Parameters: mergeProps(
				mergeProps(object(map[string]any{
					"resumeId": str("Resume id."),
				}, "resumeId"), map[string]any{
					"pageFormat":              pageFormatEnum(),
					"fontSize":                fontSizeEnum(),
					"contactNameFontSize":     fontSizeEnum(),
					"contactHeadlineFontSize": fontSizeEnum(),
					"contactDetailsFontSize":  fontSizeEnum(),
					"sectionTitleFontSize":    fontSizeEnum(),
					"itemTitleFontSize":       fontSizeEnum(),
					"itemMetaFontSize":        fontSizeEnum(),
					"marginHorizontalMm":      map[string]any{"type": "number", "description": "Horizontal page margin in millimeters."},
					"marginVerticalMm":        map[string]any{"type": "number", "description": "Vertical page margin in millimeters."},
					"themeId":                 str("Theme id from list_cv_themes."),
					"designPresetId":          designPresetEnum(),
					"showPhoto":               boolProp("Show profile photo in preview (uses uploaded, LinkedIn, then GitHub fallback)."),
					"photoPosition":           photoPositionEnum(),
					"photoSize":               photoSizeEnum(),
					"itemTitleLayout":         itemTitleLayoutEnum(),
					"itemTitleSeparator":      itemTitleSeparatorEnum(),
					"itemTitleOrder":          itemTitleOrderEnum(),
					"fontFamily":              fontFamilyEnum(),
					"accentColor":             str("Accent hex color.", "#2563eb"),
					"sectionDividerStyle":     sectionDividerStyleEnum(),
					"dateFormat":              dateFormatEnum(),
					"datePosition":            datePositionEnum(),
					"skillsLayout":            skillsLayoutEnum(),
					"atsMode":                 boolProp("ATS-friendly simplified layout for export."),
					"columnLayout":            columnLayoutEnum(),
					"sidebarPosition":         sidebarPositionEnum(),
					"sidebarWidth":            sidebarWidthEnum(),
					"contactLayout":           contactLayoutEnum(),
					"contactFields": map[string]any{
						"type":        "array",
						"description": "Contact fields to show in header.",
						"items":       contactFieldEnum(),
					},
					"locale": str("BCP-47 locale.", "en-US"),
				}),
				resumeDesignExtensionProps(str, boolProp, intProp),
			),
		},
		{
			Name:        "list_portfolios",
			Description: "List all portfolios (id and title).",
			Parameters:  object(map[string]any{}),
		},
		{
			Name:        "get_portfolio",
			Description: "Get portfolio metadata by id.",
			Parameters:  object(map[string]any{"id": str("Portfolio id.")}, "id"),
		},
		{
			Name:        "create_portfolio",
			Description: "Create a new empty portfolio site.",
			Parameters:  object(map[string]any{"title": str("Portfolio title.", "Alex Morgan, Portfolio")}, "title"),
		},
		{
			Name:        "duplicate_portfolio",
			Description: "Clone a portfolio with all projects, skills, testimonials, and settings.",
			Parameters:  object(map[string]any{"id": str("Source portfolio id.")}, "id"),
		},
		{
			Name:        "delete_portfolio",
			Description: "Permanently delete a portfolio.",
			Parameters:  object(map[string]any{"id": str("Portfolio id.")}, "id"),
		},
		{
			Name:        "update_portfolio",
			Description: "Update portfolio title, tagline, or about blurb.",
			Parameters: object(map[string]any{
				"id":      str("Portfolio id."),
				"title":   str("Site title.", "Product Designer Portfolio"),
				"tagline": str("One-line value proposition.", "Full-stack engineer building delightful web apps"),
				"about":   str("Short about section (2–4 sentences)."),
			}, "id"),
		},
		{
			Name:        "get_portfolio_content",
			Description: "Get portfolio for editing: contactProfile, tagline, about, projects (case studies), skills, testimonials, and fieldGuides. Call before add_portfolio_project or update_portfolio_project.",
			Parameters:  object(map[string]any{"id": str("Portfolio id.")}, "id"),
		},
		{
			Name: "update_portfolio_contact_profile",
			Description: `Update the hero/profile block for a portfolio (name, title, contact, links, photo).`,
			Parameters: mergeProps(object(map[string]any{
				"portfolioId": str("Portfolio id."),
			}, "portfolioId"), contactProfileFields),
		},
		{
			Name:        "add_portfolio_project",
			Description: "Add a project case study. Use PAR: problem, approach, outcome. Curate 3–5 strong projects.",
			Parameters: object(map[string]any{
				"portfolioId": str("Portfolio id."),
				"title":       str("Project name.", "Stylette"),
				"tagline":     str("One-line description.", "AI wardrobe assistant"),
				"problem":     str("What need or pain point did this address?"),
				"approach":    str("What you built and how."),
				"outcome":     str("Measurable result or impact."),
				"techStack":   map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "Technologies used."},
				"liveUrl":     urlStr("Live demo URL."),
				"repoUrl":     urlStr("Source code URL."),
				"imageUrl":    urlStr("Screenshot or cover image URL."),
				"featured":    boolProp("Mark as hero/featured project."),
			}, "portfolioId", "title"),
		},
		{
			Name:        "update_portfolio_project",
			Description: "Update a project case study by projectId from get_portfolio_content.",
			Parameters: object(map[string]any{
				"portfolioId":   str("Portfolio id."),
				"projectId":     str("Project id."),
				"title":         str("Project name."),
				"tagline":       str("One-line description."),
				"problem":       str("Problem statement."),
				"approach":      str("Your approach."),
				"outcome":       str("Result or impact."),
				"techStack":     map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
				"liveUrl":       urlStr("Live demo URL."),
				"repoUrl":       urlStr("Repo URL."),
				"imageUrl":      urlStr("Screenshot or cover image URL."),
				"showInPreview": boolProp("Show on the public portfolio preview."),
				"featured":      boolProp("Hero project."),
			}, "portfolioId", "projectId"),
		},
		{
			Name:        "delete_portfolio_project",
			Description: "Permanently delete a project from the portfolio.",
			Parameters: object(map[string]any{
				"portfolioId": str("Portfolio id."),
				"projectId":   str("Project id."),
			}, "portfolioId", "projectId"),
		},
		{
			Name:        "add_portfolio_skill",
			Description: "Add a skill to the portfolio showcase (one skill per call).",
			Parameters: object(map[string]any{
				"portfolioId": str("Portfolio id."),
				"name":        str("Skill name.", "TypeScript"),
				"category":    str("Optional group.", "Languages"),
			}, "portfolioId", "name"),
		},
		{
			Name:        "update_portfolio_skill",
			Description: "Update a portfolio skill by skillId.",
			Parameters: object(map[string]any{
				"portfolioId":   str("Portfolio id."),
				"skillId":       str("Skill id."),
				"name":          str("Skill name."),
				"category":      str("Category."),
				"showInPreview": boolProp("Show on preview."),
			}, "portfolioId", "skillId"),
		},
		{
			Name:        "delete_portfolio_skill",
			Description: "Permanently delete a skill from the portfolio.",
			Parameters: object(map[string]any{
				"portfolioId": str("Portfolio id."),
				"skillId":     str("Skill id."),
			}, "portfolioId", "skillId"),
		},
		{
			Name:        "add_portfolio_testimonial",
			Description: "Add a testimonial quote (only real quotes the user provided).",
			Parameters: object(map[string]any{
				"portfolioId": str("Portfolio id."),
				"quote":       str("The testimonial text."),
				"author":      str("Person's name."),
				"role":        str("Their title or relationship."),
			}, "portfolioId", "quote"),
		},
		{
			Name:        "update_portfolio_testimonial",
			Description: "Update a testimonial by testimonialId from get_portfolio_content.",
			Parameters: object(map[string]any{
				"portfolioId":   str("Portfolio id."),
				"testimonialId": str("Testimonial id."),
				"quote":         str("Testimonial text."),
				"author":        str("Person's name."),
				"role":          str("Their title or relationship."),
				"showInPreview": boolProp("Show on preview."),
			}, "portfolioId", "testimonialId"),
		},
		{
			Name:        "delete_portfolio_testimonial",
			Description: "Permanently delete a testimonial from the portfolio.",
			Parameters: object(map[string]any{
				"portfolioId":   str("Portfolio id."),
				"testimonialId": str("Testimonial id."),
			}, "portfolioId", "testimonialId"),
		},
		{
			Name:        "update_portfolio_settings",
			Description: "Update portfolio site design: layout, accent color, grid, typography, hero, navigation.",
			Parameters: object(map[string]any{
				"portfolioId":        str("Portfolio id."),
				"layout":             portfolioLayoutEnum(),
				"accentColor":        str("CSS hex accent color.", "#2563eb"),
				"themeId":            str("Theme id from list_cv_themes."),
				"showPhoto":          boolProp("Show profile photo in hero."),
				"locale":             str("BCP-47 locale.", "en-US"),
				"projectGridColumns": enumProp("Project grid columns", model.AllPortfolioProjectGridColumns...),
				"projectCardStyle":   enumProp("Project card style", model.AllPortfolioProjectCardStyle...),
				"typographyScale":    enumProp("Site typography scale", model.AllPortfolioTypographyScale...),
				"heroStyle":          enumProp("Hero style", model.AllPortfolioHeroStyle...),
				"navigationStyle":    enumProp("Navigation style", model.AllPortfolioNavigationStyle...),
				"animationLevel":     enumProp("Animation level", model.AllPortfolioAnimationLevel...),
			}, "portfolioId"),
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
			Description: `Create a Digital Twin career knowledge entry, structured STAR/PAR, not tied to one resume.

WHEN TO USE: Persisting career stories, skills, projects from conversation or imports.
WHEN NOT: Direct CV edits (use add_section_item) unless also mirroring to Twin.

STAR (EXPERIENCE, EDUCATION): situation, task, action, result, fill all you know.
PAR (PROJECT, SKILL_AREA): problem, action, result.
Set storyFormat=STAR or PAR explicitly. Flat fields: company, institution, location, startDate, endDate, url, level.

Returns fieldHints and missingSTARorPAR for incomplete entries.`,
			Parameters: mergeProps(object(map[string]any{
				"type":  twinEntryTypeEnum(),
				"title": str("Short label: role, project, or skill area.", "Senior Engineer @ Acme, payments rewrite"),
			}, "type", "title"), map[string]any{
				"body": str(
					"Optional resume-ready summary bullets, synthesize from STAR/PAR fields, not a substitute for them.",
					"- Cut checkout latency 40% by rewriting the payments service in Go",
				),
				"storyFormat": enumProp("Story structure: STAR for jobs/education, PAR for projects/skills.", "STAR", "PAR"),
				"situation":   str("STAR REQUIRED for EXPERIENCE, context: team, company, constraints.", "Payments team at a 50-person startup, legacy Ruby monolith"),
				"task":        str("STAR REQUIRED for EXPERIENCE, your goal or responsibility.", "Own the checkout rewrite before holiday traffic"),
				"problem":     str("PAR REQUIRED for PROJECT/SKILL, the problem you tackled.", "Checkout p95 was 8s and losing conversions"),
				"action":      str("REQUIRED, what you specifically did: concrete steps, tech, decisions.", "Led design, migrated to Go microservices, rolled out behind feature flags"),
				"result":      str("REQUIRED, measurable outcome or impact.", "p95 dropped to 1.2s; conversion up 12%"),
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
			Description: `Update a Digital Twin entry, merge new STAR/PAR fields incrementally. Same field rules as create_twin_entry.

Call after each user answer to fill gaps. Returns fieldHints and missingSTARorPAR.`,
			Parameters: mergeProps(object(map[string]any{
				"id": str("Twin entry id."),
			}, "id"), map[string]any{
				"type":           twinEntryTypeEnum(),
				"title":          str("New title."),
				"body":           str("Updated summary, prefer updating STAR/PAR fields instead."),
				"storyFormat":    enumProp("Story structure.", "STAR", "PAR"),
				"situation":      str("STAR, context."),
				"task":           str("STAR, goal or responsibility."),
				"problem":        str("PAR, problem."),
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
			Name:        "create_tracked_job",
			Description: "Add a job posting to the tracker from a URL.",
			Parameters: object(map[string]any{
				"url": urlStr("Job posting URL."),
			}, "url"),
		},
		{
			Name:        "get_tracked_job",
			Description: "Get one tracked job by id, including cover letter.",
			Parameters:  object(map[string]any{"id": str("Tracked job id.")}, "id"),
		},
		{
			Name: "update_tracked_job",
			Description: `Update a tracked job application after tailoring a CV or writing a cover letter.

WHEN TO USE: Finishing Job Tracker workflow, link tailored resumeId, save coverLetter, update status.
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
			Name:        "delete_tracked_job",
			Description: "Permanently delete a tracked job application.",
			Parameters:  object(map[string]any{"id": str("Tracked job id.")}, "id"),
		},
		{
			Name:        "web_search",
			Description: "Search the public web (DuckDuckGo). MANDATORY for role-target CV requests: search role requirements and find open job postings before creating a resume. Also use for company info, job postings, or public career facts. NOT for LinkedIn /in/ profiles (use fetch_linkedin_profile) or GitHub repos (use search_github/explore_website).",
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
			Description: "Lower-level multi-page crawl for portfolio sites. Prefer explore_website, it picks smarter strategies and returns structured importItems. Do NOT use for GitHub profiles.",
			Parameters: object(map[string]any{
				"url":      urlStr("Site base URL."),
				"maxPages": intProp("Max pages to fetch (1–12, default 10).", 1, 12),
			}, "url"),
		},
		{
			Name:        "crawl_github_profile",
			Description: "Lower-level GitHub profile crawl. Returns profile.avatar_url and top-level githubPhotoUrl for update_contact_profile. Prefer explore_website, same data plus unified importItems format.",
			Parameters: object(map[string]any{
				"url":      urlStr("GitHub profile URL (e.g. https://github.com/leoakok)."),
				"maxRepos": intProp("Max individual repos to fetch in detail (1–10, default 5).", 1, 10),
			}, "url"),
		},
		{
			Name: "search_github",
			Description: "Search or list GitHub repositories. When GitHub is connected, set listUserRepos=true to search ALL of the signed-in user's repos (paginated, includes private); result includes githubPhotoUrl for the connected account. Use query to filter by name, description, or topics (case-insensitive, partial/fuzzy match). Omit query to list top repos. Without listUserRepos, searches public GitHub globally. Prefer this over web_search for the user's own GitHub projects.",
			Parameters: object(map[string]any{
				"query":         str("Filter terms matched against repo name, full_name, description, and topics (partial, case-insensitive). Omit or \"\" with listUserRepos true to list top repos.", "stylette", "typescript portfolio"),
				"listUserRepos": boolProp("When true and GitHub is connected, fetch all user repos then filter client-side (includes private repos). Defaults to true when GitHub is connected."),
				"maxResults":    intProp("Max matching repositories to return (1–30, default 10).", 1, 30),
			}),
		},
		{
			Name:        "fetch_linkedin_profile",
			Description: "PRIMARY LinkedIn import tool. Fetch a full LinkedIn profile from a public /in/ URL. Use BEFORE fetch_url or web_search when user shares LinkedIn. Returns linkedinPhotoUrl (for update_contact_profile), structured profile text, and importItems for Twin/CV batch import.",
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
