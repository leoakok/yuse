package store

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

type resumeSectionLink struct {
	resumeID      string
	sectionID     string
	sortOrder     int
	showInPreview bool
	displayTitle  *string
}

type sectionItemLink struct {
	sectionID     string
	sectionItemID string
	sortOrder     int
}

type resumeItemVisibilityLink struct {
	resumeID      string
	sectionID     string
	sectionItemID string
	showInPreview bool
}

type portfolioSectionLink struct {
	portfolioID string
	sectionID   string
	sortOrder   int
}

type portfolioItemVisibilityLink struct {
	portfolioID   string
	sectionID     string
	sectionItemID string
	showInPreview bool
}

func clonePortfolioProject(p *model.PortfolioProject) *model.PortfolioProject {
	if p == nil {
		return nil
	}
	c := *p
	if p.TechStack != nil {
		c.TechStack = append([]string(nil), p.TechStack...)
	}
	return &c
}

func clonePortfolioSkill(s *model.PortfolioSkill) *model.PortfolioSkill {
	if s == nil {
		return nil
	}
	c := *s
	return &c
}

func clonePortfolioTestimonial(t *model.PortfolioTestimonial) *model.PortfolioTestimonial {
	if t == nil {
		return nil
	}
	c := *t
	return &c
}

func strPtr(s string) *string { return &s }

func trimmedStringPtr(s string) *string {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func defaultSectionItemHeadline(sectionType model.SectionType) string {
	switch sectionType {
	case model.SectionTypeSummary:
		return "New summary"
	case model.SectionTypeExperience:
		return "New role"
	case model.SectionTypeEducation:
		return "New education"
	case model.SectionTypeSkills:
		return "New skill group"
	case model.SectionTypeProjects:
		return "New project"
	case model.SectionTypeCertifications:
		return "New certification"
	case model.SectionTypeLanguages:
		return "New language"
	case model.SectionTypeOrganizations:
		return "New organization"
	case model.SectionTypePublications:
		return "New publication"
	case model.SectionTypeAwards:
		return "New award"
	case model.SectionTypeVolunteer:
		return "New volunteer role"
	default:
		return "New item"
	}
}

func filterResumeSections(links []resumeSectionLink, resumeID string) []resumeSectionLink {
	out := make([]resumeSectionLink, 0)
	for _, l := range links {
		if l.resumeID == resumeID {
			out = append(out, l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].sortOrder < out[j].sortOrder })
	return out
}

func appendNewItemVisibility(
	links []resumeItemVisibilityLink,
	resumeSections []resumeSectionLink,
	originResumeID, sectionID, itemID string,
) []resumeItemVisibilityLink {
	links = append(links, resumeItemVisibilityLink{
		resumeID: originResumeID, sectionID: sectionID, sectionItemID: itemID, showInPreview: true,
	})
	seen := map[string]struct{}{originResumeID: {}}
	for _, rs := range resumeSections {
		if rs.sectionID != sectionID {
			continue
		}
		if _, ok := seen[rs.resumeID]; ok {
			continue
		}
		seen[rs.resumeID] = struct{}{}
		if rs.resumeID == originResumeID {
			continue
		}
		links = append(links, resumeItemVisibilityLink{
			resumeID: rs.resumeID, sectionID: sectionID, sectionItemID: itemID, showInPreview: false,
		})
	}
	return links
}

func filterSectionItems(links []sectionItemLink, sectionID string) []sectionItemLink {
	out := make([]sectionItemLink, 0)
	for _, l := range links {
		if l.sectionID == sectionID {
			out = append(out, l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].sortOrder < out[j].sortOrder })
	return out
}

func cloneUser(u *model.User) *model.User {
	if u == nil {
		return nil
	}
	c := *u
	return &c
}

func cloneWorkspace(w *model.Workspace) *model.Workspace {
	if w == nil {
		return nil
	}
	c := *w
	return &c
}

func cloneThread(t *model.AssistantThread) *model.AssistantThread {
	if t == nil {
		return nil
	}
	c := *t
	if t.Preview != nil {
		preview := *t.Preview
		c.Preview = &preview
	}
	return &c
}

func cloneTheme(t *model.CvTheme) *model.CvTheme {
	if t == nil {
		return nil
	}
	c := *t
	if t.Config != nil {
		c.Config = cloneJSON(t.Config)
	}
	return &c
}

func cloneResume(r *model.Resume) *model.Resume {
	if r == nil {
		return nil
	}
	c := *r
	return &c
}

func cloneSection(s *model.Section) *model.Section {
	if s == nil {
		return nil
	}
	c := *s
	return &c
}

func withDefaultShowInPreview(item *model.SectionItem) *model.SectionItem {
	if item == nil {
		return nil
	}
	item.ShowInPreview = true
	return item
}

func cloneSectionItem(item *model.SectionItem) *model.SectionItem {
	if item == nil {
		return nil
	}
	c := *item
	c.ShowInPreview = item.ShowInPreview
	if item.Metadata != nil {
		c.Metadata = cloneJSON(item.Metadata)
	}
	return &c
}

func cloneContactProfile(p *model.ContactProfile) *model.ContactProfile {
	if p == nil {
		return nil
	}
	c := *p
	return &c
}

func cloneResumeSettings(s *model.ResumeSettings) *model.ResumeSettings {
	if s == nil {
		return nil
	}
	c := *s
	return &c
}

func cloneAssistantMessage(msg *model.AssistantMessage) *model.AssistantMessage {
	if msg == nil {
		return nil
	}
	c := *msg
	if msg.Context != nil {
		c.Context = cloneJSON(msg.Context)
	}
	return &c
}

func cloneActionLog(log *model.AssistantActionLog) *model.AssistantActionLog {
	if log == nil {
		return nil
	}
	c := *log
	if log.Payload != nil {
		c.Payload = cloneJSON(log.Payload)
	}
	return &c
}

func cloneJSON(src map[string]any) map[string]any {
	if src == nil {
		return map[string]any{}
	}
	dst := make(map[string]any, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func mergeMetadata(existing map[string]any, metadata map[string]any) map[string]any {
	merged := make(map[string]any, len(existing)+len(metadata))
	for k, v := range existing {
		merged[k] = v
	}
	for k, v := range metadata {
		if v == nil {
			delete(merged, k)
		} else if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
			merged[k] = ""
		} else {
			merged[k] = v
		}
	}
	return merged
}

func cloneTwinEntry(entry *model.TwinEntry) *model.TwinEntry {
	if entry == nil {
		return nil
	}
	c := *entry
	if entry.Metadata != nil {
		c.Metadata = cloneJSON(entry.Metadata)
	}
	return &c
}

// normalizeFontSize maps stored values to a valid FontSize tier (XS–XL).
func normalizeFontSize(raw string) model.FontSize {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "XS":
		return model.FontSizeXs
	case "S":
		return model.FontSizeS
	case "M":
		return model.FontSizeM
	case "L":
		return model.FontSizeL
	case "XL":
		return model.FontSizeXl
	default:
		return model.FontSizeM
	}
}

func defaultResumeSettings(resumeID string) *model.ResumeSettings {
	return &model.ResumeSettings{
		ResumeID:                resumeID,
		ThemeID:                 "theme-modern",
		FontSize:                model.FontSizeM,
		ContactNameFontSize:     model.FontSizeM,
		ContactHeadlineFontSize: model.FontSizeM,
		ContactDetailsFontSize:  model.FontSizeM,
		SectionTitleFontSize:    model.FontSizeM,
		ItemTitleFontSize:       model.FontSizeM,
		ItemMetaFontSize:        model.FontSizeM,
		PageFormat:              model.PageFormatA4,
		MarginHorizontalMm:      12,
		MarginVerticalMm:        12,
		ShowPhoto:               false,
		ItemTitleLayout:         model.ItemTitleLayoutStacked,
		ItemTitleSeparator:      model.ItemTitleSeparatorDot,
		ItemTitleOrder:          model.ItemTitleOrderTitleFirst,
		FontFamily:              model.FontFamilySans,
		AccentColor:             "#c45c3e",
		SectionDividerStyle:     model.SectionDividerStyleFull,
		DateFormat:              model.DateFormatMonYyyy,
		DatePosition:            model.DatePositionRight,
		SkillsLayout:            model.SkillsLayoutList,
		AtsMode:                 false,
		ColumnLayout:            model.ColumnLayoutSingle,
		SidebarPosition:         model.SidebarPositionLeft,
		SidebarWidth:            model.SidebarWidthMedium,
		DesignPresetID:          model.DesignPresetIDModern,
		PhotoPosition:           model.PhotoPositionHeaderLeft,
		PhotoSize:               model.PhotoSizeM,
		ContactLayout:           model.ContactLayoutInline,
		ContactFields:           defaultContactFields(),
		SectionSpacing:          model.SpacingDensityNormal,
		ItemSpacing:             model.SpacingDensityNormal,
		DescriptionStyle:        model.DescriptionStyleBullets,
		BulletChar:              model.BulletCharDot,
		ItemTitleEmphasis:       model.ItemTitleEmphasisTitle,
		HighlightCurrentRole:    false,
		LocationDisplay:         model.LocationDisplayOwnLine,
		HeadingFontFamily:       model.FontFamilySans,
		BodyFontFamily:          model.FontFamilySans,
		NameFontWeight:          model.FontWeightRoleSemibold,
		SectionTitleFontWeight:  model.FontWeightRoleSemibold,
		LineHeight:              model.LineHeightDensityNormal,
		HeadingLetterSpacing:    model.LetterSpacingDensityNormal,
		SectionTitleCase:        model.SectionTitleCaseCapitalize,
		TextPrimaryColor:        "",
		TextMutedColor:          "",
		PageBackground:          model.PageBackgroundWhite,
		LinkColor:               "",
		SkillsProficiency:       model.SkillsProficiencyNone,
		LanguagesLayout:         model.LanguagesLayoutList,
		CertificationsLayout:    model.CertificationsLayoutList,
		KeepSectionsTogether:    true,
		MaxItemsBeforeBreak:     nil,
		FooterStyle:             model.FooterStyleNone,
		ExportFilenameTemplate:  "{name}-resume",
		Locale:                  "en-US",
	}
}

func encodeContactFields(fields []model.ContactField) []byte {
	if len(fields) == 0 {
		fields = defaultContactFields()
	}
	raw := make([]string, len(fields))
	for i, f := range fields {
		raw[i] = string(f)
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return []byte(`["EMAIL","PHONE","LOCATION","WEBSITE"]`)
	}
	return b
}

func normalizeFontFamily(raw string) model.FontFamily {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "SERIF":
		return model.FontFamilySerif
	case "MONO":
		return model.FontFamilyMono
	default:
		return model.FontFamilySans
	}
}

func defaultPortfolioSettings(portfolioID string) *model.PortfolioSettings {
	return &model.PortfolioSettings{
		PortfolioID:        portfolioID,
		ThemeID:            "theme-modern",
		Layout:             model.PortfolioLayoutSingle,
		AccentColor:        "#2563eb",
		ShowPhoto:          false,
		Locale:             "en-US",
		ProjectGridColumns: model.PortfolioProjectGridColumnsTwo,
		ProjectCardStyle:   model.PortfolioProjectCardStyleStandard,
		TypographyScale:    model.PortfolioTypographyScaleNormal,
		HeroStyle:          model.PortfolioHeroStyleGradient,
		NavigationStyle:    model.PortfolioNavigationStyleTop,
		AnimationLevel:     model.PortfolioAnimationLevelSubtle,
	}
}

func clonePortfolioSettings(s *model.PortfolioSettings) *model.PortfolioSettings {
	if s == nil {
		return nil
	}
	c := *s
	return &c
}

func clonePortfolio(p *model.Portfolio) *model.Portfolio {
	if p == nil {
		return nil
	}
	c := *p
	return &c
}
