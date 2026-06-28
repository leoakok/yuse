package store

import (
	"sort"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

type resumeSectionLink struct {
	resumeID  string
	sectionID string
	sortOrder int
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

func defaultResumeSettings(resumeID string) *model.ResumeSettings {
	return &model.ResumeSettings{
		ResumeID:           resumeID,
		ThemeID:            "theme-modern",
		FontSize:           model.FontSizeM,
		PageFormat:         model.PageFormatA4,
		MarginHorizontalMm: 12,
		MarginVerticalMm:   12,
		ShowPhoto:          false,
		Locale:             "en-US",
	}
}
