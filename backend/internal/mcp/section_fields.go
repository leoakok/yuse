package mcp

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/sectionmeta"
)

// Flat metadata fields promoted to top-level tool parameters (merged into metadata at execution).
var flatMetadataKeys = []string{
	"company", "institution", "location", "startDate", "endDate", "url", "level",
}

var (
	dateRangeInBodyPattern = regexp.MustCompile(`(?i)(\d{4})\s*[-–—]\s*(\d{4}|present)`)
	yearInBodyPattern      = regexp.MustCompile(`\b(19|20)\d{2}\b`)
	locationInBodyPattern  = regexp.MustCompile(`(?i)^(remote|[\w\s]+,\s*[\w]{2,})\s*$`)
	headlineAtCompany      = regexp.MustCompile(`(?i)^(.+?)\s+(?:at|@)\s+(.+)$`)
	headlineDashCompany    = regexp.MustCompile(`^(.+?)\s+[—–-]\s+(.+)$`)
)

var trackedJobMetaKeys = []string{
	"location", "source", "salary", "remote", "description",
}

func mergeFlatFieldsIntoMetadata(args map[string]any) map[string]any {
	meta := optionalMetadataMap(args, "metadata")
	if meta == nil {
		meta = map[string]any{}
	}
	for _, key := range flatMetadataKeys {
		mergeStringArgIntoMeta(args, meta, key)
	}
	if present, ok := optionalBool(args, "endDatePresent"); ok && present {
		if metaString(meta, "endDate") == "" {
			meta["endDate"] = "Present"
		}
	}
	if len(meta) > 0 {
		args["metadata"] = meta
	}
	return meta
}

func mergeTrackedJobMetadata(args map[string]any) map[string]any {
	meta := optionalMetadataMap(args, "metadata")
	if meta == nil {
		meta = map[string]any{}
	}
	for _, key := range trackedJobMetaKeys {
		if key == "remote" {
			if v, ok := args["remote"]; ok {
				meta["remote"] = v
			}
			continue
		}
		mergeStringArgIntoMeta(args, meta, key)
	}
	if len(meta) > 0 {
		args["metadata"] = meta
	}
	return meta
}

func mergeStringArgIntoMeta(args, meta map[string]any, key string) {
	v, ok := args[key]
	if !ok || v == nil {
		return
	}
	s, ok := v.(string)
	if !ok || strings.TrimSpace(s) == "" {
		return
	}
	if existing, ok := meta[key]; !ok || fmt.Sprint(existing) == "" {
		meta[key] = strings.TrimSpace(s)
	}
}

func sectionItemFieldGuide(sectionType model.SectionType) string {
	switch sectionType {
	case model.SectionTypeSummary:
		return "headline=short label (e.g. Professional summary); body=summary paragraph"
	case model.SectionTypeExperience:
		return "headline=job title only (not the section name); metadata.company=employer; metadata.location, startDate, endDate; body=achievement bullets"
	case model.SectionTypeEducation:
		return "headline=degree or program only (e.g. Bachelor of Science in Physics); metadata.institution=school; metadata.startDate, endDate=years; body=optional honors or coursework; one item per degree"
	case model.SectionTypeSkills:
		return "headline=one skill name only (e.g. TypeScript, Project management); metadata.level=BEGINNER|INTERMEDIATE|PROFICIENT|ADVANCED|EXPERT; body=optional context; call add_section_item once per skill, never comma-list many skills in one item"
	case model.SectionTypeProjects, model.SectionTypeCertifications:
		return "headline=project or certification name; metadata.url=optional link; body=description"
	case model.SectionTypeLanguages:
		return "headline=one spoken language only (e.g. English, German); metadata.level=BEGINNER|INTERMEDIATE|PROFICIENT|FLUENT|NATIVE; body=optional notes; call add_section_item once per language, never combine languages in one item"
	case model.SectionTypeOrganizations:
		return "headline=organization name; metadata.url=optional link; body=role or involvement"
	case model.SectionTypePublications:
		return "headline=publication title; metadata.url=optional link; metadata.startDate=year; body=venue or summary"
	case model.SectionTypeAwards:
		return "headline=award name; metadata.startDate=year; body=issuer or context"
	case model.SectionTypeVolunteer:
		return "headline=role or program; metadata.institution=organization; metadata.startDate/endDate; body=impact"
	default:
		return "headline=title; body=details"
	}
}

func normalizeSectionItemArgs(sectionType model.SectionType, args map[string]any) {
	meta := optionalMetadataMap(args, "metadata")
	if meta == nil {
		meta = map[string]any{}
		args["metadata"] = meta
	}

	applyMetaAlias(meta, "institution", "school", "university", "college")
	applyMetaAlias(meta, "company", "employer", "organization")

	if headline, _ := optionalString(args, "headline"); headline == "" {
		if degree, ok := meta["degree"].(string); ok && strings.TrimSpace(degree) != "" {
			args["headline"] = strings.TrimSpace(degree)
			delete(meta, "degree")
		}
	}

	headline, _ := optionalString(args, "headline")
	body, _ := optionalString(args, "body")

	switch sectionType {
	case model.SectionTypeExperience:
		normalizeExperienceHeadline(args, meta, headline)
		normalizeDatesFromBody(meta, body)
		normalizeCompanyFromBody(meta, body)
		normalizeLocationFromBody(meta, body)
	case model.SectionTypeEducation:
		normalizeDatesFromBody(meta, body)
	case model.SectionTypeProjects, model.SectionTypeVolunteer:
		normalizeDatesFromBody(meta, body)
	}
}

func normalizeExperienceHeadline(args, meta map[string]any, headline string) {
	headline = strings.TrimSpace(headline)
	if headline == "" {
		return
	}
	if metaString(meta, "company") != "" {
		return
	}
	if m := headlineAtCompany.FindStringSubmatch(headline); len(m) == 3 {
		args["headline"] = strings.TrimSpace(m[1])
		meta["company"] = strings.TrimSpace(m[2])
		return
	}
	if m := headlineDashCompany.FindStringSubmatch(headline); len(m) == 3 {
		right := strings.TrimSpace(m[2])
		if !looksLikeDateFragment(right) {
			args["headline"] = strings.TrimSpace(m[1])
			meta["company"] = right
		}
	}
}

func normalizeDatesFromBody(meta map[string]any, body string) {
	if metaString(meta, "startDate") != "" {
		return
	}
	body = strings.TrimSpace(body)
	if body == "" {
		return
	}
	firstLine := strings.TrimSpace(strings.Split(body, "\n")[0])
	if m := dateRangeInBodyPattern.FindStringSubmatch(firstLine); len(m) == 3 {
		meta["startDate"] = m[1]
		end := strings.TrimSpace(m[2])
		if strings.EqualFold(end, "present") {
			meta["endDate"] = "Present"
		} else {
			meta["endDate"] = end
		}
	}
}

func normalizeCompanyFromBody(meta map[string]any, body string) {
	if metaString(meta, "company") != "" {
		return
	}
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		lower := strings.ToLower(line)
		if strings.HasPrefix(lower, "company:") {
			meta["company"] = strings.TrimSpace(line[len("company:"):])
			return
		}
		if strings.HasPrefix(lower, "employer:") {
			meta["company"] = strings.TrimSpace(line[len("employer:"):])
			return
		}
	}
}

func normalizeLocationFromBody(meta map[string]any, body string) {
	if metaString(meta, "location") != "" {
		return
	}
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(line, "- "), "• "))
		if locationInBodyPattern.MatchString(line) && !looksLikeDateFragment(line) {
			meta["location"] = line
			return
		}
	}
}

func looksLikeDateFragment(s string) bool {
	s = strings.TrimSpace(s)
	if dateRangeInBodyPattern.MatchString(s) {
		return true
	}
	return yearInBodyPattern.MatchString(s) && len(s) <= 12
}

func bodyContainsDateRange(body string) bool {
	return dateRangeInBodyPattern.MatchString(body) || countYearsInText(body) >= 2
}

func countYearsInText(text string) int {
	matches := yearInBodyPattern.FindAllString(text, -1)
	return len(matches)
}

func bodyLooksLikeMetadataDump(sectionType model.SectionType, body string, metadata map[string]any) bool {
	body = strings.TrimSpace(body)
	if body == "" {
		return false
	}
	firstLine := strings.TrimSpace(strings.Split(body, "\n")[0])
	switch sectionType {
	case model.SectionTypeExperience:
		if metaString(metadata, "company") == "" {
			lower := strings.ToLower(firstLine)
			if strings.HasPrefix(lower, "company:") || strings.HasPrefix(lower, "employer:") {
				return true
			}
		}
		if metaString(metadata, "startDate") == "" && bodyContainsDateRange(body) {
			return true
		}
		if metaString(metadata, "location") == "" && locationInBodyPattern.MatchString(firstLine) {
			return true
		}
	case model.SectionTypeEducation:
		if metaString(metadata, "institution") == "" && looksLikeCombinedEducationLine(firstLine) {
			return true
		}
		if metaString(metadata, "startDate") == "" && bodyContainsDateRange(body) {
			return true
		}
	}
	return false
}

func collectSectionItemFieldHints(
	sectionType model.SectionType,
	headline, body string,
	metadata map[string]any,
) []string {
	var hints []string
	spec := sectionFieldSpecFor(sectionType)

	for _, field := range spec.Required {
		if hasStructuredField(field, headline, body, metadata) {
			continue
		}
		hints = append(hints, fmt.Sprintf("missing required field %s, %s", field, spec.Fields[field]))
	}

	switch sectionType {
	case model.SectionTypeExperience:
		if bodyContainsDateRange(body) && metaString(metadata, "startDate") == "" {
			hints = append(hints, "move dates from body to startDate/endDate (or endDatePresent=true for ongoing roles)")
		}
		if metaString(metadata, "company") == "" && bodyLooksLikeMetadataDump(sectionType, body, metadata) {
			hints = append(hints, "move employer from body to company field")
		}
		if strings.TrimSpace(body) != "" && !strings.Contains(body, "\n") && !strings.HasPrefix(strings.TrimSpace(body), "-") {
			if metaString(metadata, "company") != "" || bodyContainsDateRange(body) {
				hints = append(hints, "body should be achievement bullets only, use \"- \" prefix per bullet")
			}
		}
	case model.SectionTypeSkills, model.SectionTypeLanguages:
		if metaString(metadata, "level") == "" {
			hints = append(hints, "set level enum for structured "+strings.ToLower(string(sectionType))+" items")
		}
	case model.SectionTypeEducation:
		if metaString(metadata, "institution") == "" {
			hints = append(hints, "set institution=school name; headline=degree only")
		}
	}

	if bodyLooksLikeMetadataDump(sectionType, body, metadata) {
		hints = append(hints, "body contains metadata, use structured fields instead of dumping company/dates/location in body")
	}

	return dedupeStrings(hints)
}

func hasStructuredField(field, headline, body string, metadata map[string]any) bool {
	switch field {
	case "headline":
		return strings.TrimSpace(headline) != ""
	case "body":
		return strings.TrimSpace(body) != ""
	case "level", "company", "institution", "location", "startDate", "endDate", "url":
		return metaString(metadata, field) != ""
	default:
		return false
	}
}

func dedupeStrings(items []string) []string {
	seen := make(map[string]bool, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}

func flattenItemMetadata(item map[string]any) map[string]any {
	meta, _ := item["metadata"].(map[string]any)
	if meta == nil {
		return item
	}
	for _, key := range flatMetadataKeys {
		if v, ok := meta[key]; ok && fmt.Sprint(v) != "" {
			if _, exists := item[key]; !exists {
				item[key] = v
			}
		}
	}
	return item
}

func wrapSectionItemWriteResult(
	content *model.ResumeWithContent,
	section *model.Section,
	headline, body string,
	metadata map[string]any,
) map[string]any {
	out := resumeContentSummary(content)
	if section != nil {
		out["sectionType"] = section.Type
		out["fieldHints"] = collectSectionItemFieldHints(section.Type, headline, body, metadata)
		out["fieldGuide"] = sectionItemFieldGuideObject(section.Type)
	}
	return out
}

func contactProfileFromContent(content *model.ResumeWithContent) map[string]any {
	if content == nil || content.ContactProfile == nil {
		return nil
	}
	cp := content.ContactProfile
	return map[string]any{
		"fullName":         cp.FullName,
		"headline":         cp.Headline,
		"email":            cp.Email,
		"phone":            cp.Phone,
		"location":         cp.Location,
		"website":          cp.Website,
		"linkedIn":         cp.LinkedIn,
		"github":           cp.Github,
		"photoUrl":         cp.PhotoURL,
		"linkedinPhotoUrl": cp.LinkedinPhotoURL,
		"githubPhotoUrl":   cp.GithubPhotoURL,
	}
}

func contactProfileFieldHints(args map[string]any) []string {
	var hints []string
	if _, ok := args["fullName"]; !ok {
		hints = append(hints, "fullName is the display name in the Profile header")
	}
	if _, ok := args["headline"]; !ok {
		hints = append(hints, "headline is the professional title under the name, not a section item")
	}
	return hints
}

func wrapTrackedJobResult(job *model.TrackedJob) map[string]any {
	if job == nil {
		return nil
	}
	out := map[string]any{
		"id":          job.ID,
		"title":       job.Title,
		"company":     job.Company,
		"status":      job.Status,
		"notes":       job.Notes,
		"coverLetter": job.CoverLetter,
		"url":         job.URL,
	}
	if job.ResumeID != nil {
		out["resumeId"] = *job.ResumeID
	}
	if len(job.Metadata) > 0 {
		out["metadata"] = job.Metadata
	}
	var hints []string
	if strings.TrimSpace(job.CoverLetter) == "" {
		hints = append(hints, "coverLetter is empty, save the tailored cover letter text when finishing Job Tracker workflow")
	}
	if job.ResumeID == nil || strings.TrimSpace(*job.ResumeID) == "" {
		hints = append(hints, "resumeId not linked, set to the tailored resume id after create_resume/duplicate_resume")
	}
	if len(hints) > 0 {
		out["fieldHints"] = hints
	}
	return out
}

func validateSectionItemInput(
	section *model.Section,
	headline string,
	body string,
	metadata map[string]any,
) error {
	if section == nil {
		return nil
	}

	trimmedHeadline := strings.TrimSpace(headline)
	lowerHeadline := strings.ToLower(trimmedHeadline)
	sectionTitle := strings.ToLower(strings.TrimSpace(section.Title))

	if trimmedHeadline != "" && lowerHeadline == sectionTitle {
		return fmt.Errorf(
			"headline must not be the section title %q, use the %s",
			section.Title,
			sectionHeadlineHint(section.Type),
		)
	}

	switch section.Type {
	case model.SectionTypeEducation:
		if isGenericSectionLabel(lowerHeadline, "education", "educations") {
			return fmt.Errorf(
				"headline must be the degree or program (e.g. Bachelor of Science in Physics), not %q; put the school in institution and dates in startDate/endDate",
				trimmedHeadline,
			)
		}
		if looksLikeCombinedEducationLine(trimmedHeadline) && metadata != nil {
			if inst, _ := metadata["institution"].(string); strings.TrimSpace(inst) == "" {
				return fmt.Errorf(
					"split degree and school: headline=degree only, institution=school name, startDate/endDate=years; call add_section_item once per degree",
				)
			}
		}
		if countEducationDegreeLines(body) >= 2 {
			return fmt.Errorf(
				"add one education item per degree, do not put multiple degrees in body; call add_section_item separately for each",
			)
		}
	case model.SectionTypeExperience:
		if isGenericSectionLabel(lowerHeadline, "work experience", "experience", "employment") {
			return fmt.Errorf(
				"headline must be the job title (e.g. Senior Engineer), not %q; put the employer in company",
				trimmedHeadline,
			)
		}
		if metaString(metadata, "company") == "" && (headlineAtCompany.MatchString(trimmedHeadline) || headlineDashCompany.MatchString(trimmedHeadline)) {
			return fmt.Errorf(
				"split title and employer: headline=job title only, company=employer, do not combine in headline",
			)
		}
		if bodyLooksLikeMetadataDump(section.Type, body, metadata) && strings.TrimSpace(body) != "" {
			nonBulletLines := 0
			for _, line := range strings.Split(body, "\n") {
				trimmed := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(line, "- "), "• "))
				if trimmed == "" {
					continue
				}
				if !strings.HasPrefix(strings.TrimSpace(line), "-") && !strings.HasPrefix(strings.TrimSpace(line), "•") {
					nonBulletLines++
				}
			}
			if nonBulletLines > 0 && metaString(metadata, "company") == "" {
				return fmt.Errorf(
					"EXPERIENCE body must be achievement bullets only, put employer in company, location in location, dates in startDate/endDate; do not dump job metadata in body",
				)
			}
		}
	case model.SectionTypeSummary:
		if isGenericSectionLabel(lowerHeadline, "summary", "professional summary") && strings.TrimSpace(body) == "" {
			return fmt.Errorf("put the summary paragraph in body, not only in headline")
		}
	case model.SectionTypeSkills:
		if err := validateStructuredLevelItem(trimmedHeadline, body, metadata, "skill", sectionmeta.AllSkillLevels); err != nil {
			return err
		}
	case model.SectionTypeLanguages:
		if err := validateStructuredLevelItem(trimmedHeadline, body, metadata, "language", sectionmeta.AllLanguageLevels); err != nil {
			return err
		}
	}

	return nil
}

func validateStructuredLevelItem(
	headline, body string, metadata map[string]any, itemKind string, allowedLevels []string,
) error {
	if strings.Contains(headline, ",") {
		return fmt.Errorf(
			"add one %s per item, headline must be a single %s name, not a comma-separated list; call add_section_item separately for each",
			itemKind, itemKind,
		)
	}
	if isGenericSectionLabel(strings.ToLower(headline), itemKind+"s", itemKind) {
		return fmt.Errorf(
			"headline must be one %s name (e.g. English or TypeScript), not the section label %q; set metadata.level for proficiency",
			itemKind, headline,
		)
	}
	if countListLikeEntries(body) >= 2 {
		return fmt.Errorf(
			"add one %s per item, do not put multiple %ss in body; call add_section_item separately for each with metadata.level",
			itemKind, itemKind,
		)
	}
	level := metaString(metadata, "level")
	if level != "" && !isAllowedLevel(level, allowedLevels) {
		return fmt.Errorf(
			"metadata.level must be one of %s for this %s, got %q",
			strings.Join(allowedLevels, ", "), itemKind, level,
		)
	}
	return nil
}

func metaString(metadata map[string]any, key string) string {
	if metadata == nil {
		return ""
	}
	v, ok := metadata[key]
	if !ok || v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(v))
}

func isAllowedLevel(level string, allowed []string) bool {
	for _, v := range allowed {
		if v == level {
			return true
		}
	}
	return false
}

func countListLikeEntries(body string) int {
	body = strings.TrimSpace(body)
	if body == "" {
		return 0
	}
	count := 0
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(line, "• "), "- "))
		if trimmed == "" {
			continue
		}
		count++
	}
	if count >= 2 {
		return count
	}
	if strings.Contains(body, ",") {
		parts := strings.Split(body, ",")
		nonEmpty := 0
		for _, p := range parts {
			if strings.TrimSpace(p) != "" {
				nonEmpty++
			}
		}
		if nonEmpty >= 2 {
			return nonEmpty
		}
	}
	return count
}

func sectionHeadlineHint(sectionType model.SectionType) string {
	switch sectionType {
	case model.SectionTypeEducation:
		return "degree or program name"
	case model.SectionTypeExperience:
		return "job title"
	case model.SectionTypeSkills:
		return "skill name"
	case model.SectionTypeLanguages:
		return "language name"
	case model.SectionTypeSummary:
		return "summary content in body"
	default:
		return "item title"
	}
}

func isGenericSectionLabel(headline string, labels ...string) bool {
	for _, label := range labels {
		if headline == label {
			return true
		}
	}
	return false
}

func looksLikeCombinedEducationLine(headline string) bool {
	lower := strings.ToLower(headline)
	return strings.Contains(headline, ", ") ||
		strings.Contains(headline, " - ") ||
		strings.Contains(lower, "university") ||
		strings.Contains(lower, "college") ||
		strings.Contains(lower, "institute")
}

func countEducationDegreeLines(body string) int {
	count := 0
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		trimmed = strings.TrimPrefix(trimmed, "- ")
		trimmed = strings.TrimPrefix(trimmed, "• ")
		trimmed = strings.TrimSpace(trimmed)
		if trimmed == "" {
			continue
		}
		if looksLikeCombinedEducationLine(trimmed) {
			count++
		}
	}
	return count
}

func findSection(exec Executor, sectionID string) *model.Section {
	for _, section := range exec.ListSections(nil) {
		if section.ID == sectionID {
			return section
		}
	}
	return nil
}

func optionalMetadataMap(args map[string]any, key string) map[string]any {
	raw, ok := args[key]
	if !ok || raw == nil {
		return nil
	}
	switch m := raw.(type) {
	case map[string]any:
		return m
	default:
		return nil
	}
}

func applyMetaAlias(meta map[string]any, target string, aliases ...string) {
	if v, ok := meta[target]; ok && fmt.Sprint(v) != "" {
		return
	}
	for _, alias := range aliases {
		if v, ok := meta[alias]; ok && fmt.Sprint(v) != "" {
			meta[target] = v
			return
		}
	}
}
