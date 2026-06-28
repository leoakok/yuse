// In-memory store for unit tests only — not used in production bootstrap.
package store

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
)

var ErrNotFound = errors.New("not found")

const (
	DemoUserID      = "user-demo"
	DemoWorkspaceID = "ws-demo"
	DemoThreadID    = "thread-demo"
)

type Memory struct {
	mu                sync.RWMutex
	user              *model.User
	workspace         *model.Workspace
	threads           map[string]*model.AssistantThread
	messages          []*model.AssistantMessage
	actionLogs        []*model.AssistantActionLog
	contactProfiles   map[string]*model.ContactProfile
	resumes           map[string]*model.Resume
	sections          map[string]*model.Section
	sectionItems      map[string]*model.SectionItem
	resumeSections       []resumeSectionLink
	sectionItemLinks     []sectionItemLink
	itemVisibilityLinks  []resumeItemVisibilityLink
	resumeSettings       map[string]*model.ResumeSettings
	themes            []*model.CvTheme
	twinEntries       map[string]*model.TwinEntry
	trackedJobs         map[string]*model.TrackedJob
}

func NewMemory() *Memory {
	m := &Memory{
		contactProfiles:  make(map[string]*model.ContactProfile),
		resumes:          make(map[string]*model.Resume),
		sections:         make(map[string]*model.Section),
		sectionItems:     make(map[string]*model.SectionItem),
		resumeSettings:   make(map[string]*model.ResumeSettings),
		twinEntries:      make(map[string]*model.TwinEntry),
		trackedJobs:      make(map[string]*model.TrackedJob),
		threads:          make(map[string]*model.AssistantThread),
		messages:         []*model.AssistantMessage{},
		actionLogs:       []*model.AssistantActionLog{},
	}
	m.seed()
	return m
}

func (m *Memory) seed() {
	now := time.Now().UTC()
	ago := func(d time.Duration) string {
		return now.Add(-d).Format(time.RFC3339)
	}

	m.user = &model.User{
		ID:          DemoUserID,
		Email:       "demo@cvbuilder.local",
		DisplayName: "Demo User",
		CreatedAt:   ago(30 * 24 * time.Hour),
		UpdatedAt:   now.Format(time.RFC3339),
	}

	m.workspace = &model.Workspace{
		ID:        DemoWorkspaceID,
		Name:      "My CVs",
		Slug:      "my-cvs",
		OwnerID:   DemoUserID,
		Plan:      "free",
		CreatedAt: ago(30 * 24 * time.Hour),
		UpdatedAt: now.Format(time.RFC3339),
	}

	m.threads[DemoThreadID] = &model.AssistantThread{
		ID:          DemoThreadID,
		WorkspaceID: DemoWorkspaceID,
		CreatedAt:   ago(24 * time.Hour),
		UpdatedAt:   now.Format(time.RFC3339),
	}

	m.themes = []*model.CvTheme{
		{ID: "theme-classic", Name: "Classic", Slug: "classic", IsSystem: true, Config: map[string]any{"fontFamily": "serif"}},
		{ID: "theme-modern", Name: "Modern", Slug: "modern", IsSystem: true, Config: map[string]any{"fontFamily": "sans"}},
		{ID: "theme-compact", Name: "Compact", Slug: "compact", IsSystem: true, Config: map[string]any{"density": "tight"}},
	}

	profile := &model.ContactProfile{
		ID:          "profile-leo",
		WorkspaceID: DemoWorkspaceID,
		FullName:    "Alex Morgan",
		Headline:    strPtr("Senior Software Engineer"),
		Email:       strPtr("alex@example.com"),
		Phone:       strPtr("+1 555 0100"),
		Location:    strPtr("San Francisco, CA"),
		Website:     strPtr("https://alexmorgan.dev"),
		LinkedIn:    strPtr("linkedin.com/in/alexmorgan"),
		Github:      strPtr("github.com/alexmorgan"),
		CreatedAt:   ago(7 * 24 * time.Hour),
		UpdatedAt:   ago(24 * time.Hour),
	}
	m.contactProfiles[profile.ID] = profile

	items := []*model.SectionItem{
		{
			ID: "item-acme", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeExperience,
			Headline: "Senior Engineer",
			Body:     "- Led platform migration to Go and GraphQL\n- Mentored 4 engineers\n- Reduced API latency by 40%",
			Metadata: map[string]any{"company": "Acme Corp", "startDate": "2021-03", "endDate": "", "location": "Remote"},
			CreatedBy: DemoUserID, CreatedAt: ago(14 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-startup", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeExperience,
			Headline: "Founding Engineer",
			Body:     "- Built MVP in 8 weeks\n- Owned infra on Azure and Vercel",
			Metadata: map[string]any{"company": "Bright Labs", "startDate": "2019-01", "endDate": "2021-02", "location": "NYC"},
			CreatedBy: DemoUserID, CreatedAt: ago(20 * 24 * time.Hour), UpdatedAt: ago(5 * 24 * time.Hour),
		},
		{
			ID: "item-msc", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeEducation,
			Headline: "MSc Computer Science",
			Body:     "Focus on distributed systems and machine learning.",
			Metadata: map[string]any{"institution": "MIT", "startDate": "2017", "endDate": "2019"},
			CreatedBy: DemoUserID, CreatedAt: ago(25 * 24 * time.Hour), UpdatedAt: ago(10 * 24 * time.Hour),
		},
		{
			ID: "item-skill-ts", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSkills,
			Headline: "TypeScript",
			Metadata: map[string]any{"level": "EXPERT"},
			CreatedBy: DemoUserID, CreatedAt: ago(3 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-skill-go", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSkills,
			Headline: "Go",
			Metadata: map[string]any{"level": "PROFICIENT"},
			CreatedBy: DemoUserID, CreatedAt: ago(3 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-skill-react", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSkills,
			Headline: "React",
			Metadata: map[string]any{"level": "PROFICIENT"},
			CreatedBy: DemoUserID, CreatedAt: ago(3 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-lang-en", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeLanguages,
			Headline: "English",
			Metadata: map[string]any{"level": "NATIVE"},
			CreatedBy: DemoUserID, CreatedAt: ago(2 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-lang-de", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeLanguages,
			Headline: "German",
			Metadata: map[string]any{"level": "BEGINNER"},
			CreatedBy: DemoUserID, CreatedAt: ago(2 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
		{
			ID: "item-summary", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSummary,
			Headline: "Professional summary",
			Body:     "Full-stack engineer with 8+ years building developer tools and AI-native products.",
			Metadata: map[string]any{},
			CreatedBy: DemoUserID, CreatedAt: ago(2 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour),
		},
	}
	for _, item := range items {
		m.sectionItems[item.ID] = item
	}

	sections := []*model.Section{
		{ID: "section-exp", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeExperience, Title: "Work Experience", CreatedBy: DemoUserID, CreatedAt: ago(14 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour)},
		{ID: "section-edu", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeEducation, Title: "Education", CreatedBy: DemoUserID, CreatedAt: ago(20 * 24 * time.Hour), UpdatedAt: ago(5 * 24 * time.Hour)},
		{ID: "section-skills", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSkills, Title: "Skills", CreatedBy: DemoUserID, CreatedAt: ago(3 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour)},
		{ID: "section-lang", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeLanguages, Title: "Languages", CreatedBy: DemoUserID, CreatedAt: ago(2 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour)},
		{ID: "section-summary", WorkspaceID: DemoWorkspaceID, Type: model.SectionTypeSummary, Title: "Summary", CreatedBy: DemoUserID, CreatedAt: ago(2 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour)},
	}
	for _, section := range sections {
		m.sections[section.ID] = section
	}

	contactID := profile.ID
	resumes := []*model.Resume{
		{ID: "resume-swe", WorkspaceID: DemoWorkspaceID, Title: "Senior SWE Resume", ContactProfileID: &contactID, CreatedBy: DemoUserID, CreatedAt: ago(7 * 24 * time.Hour), UpdatedAt: ago(time.Hour)},
		{ID: "resume-startup", WorkspaceID: DemoWorkspaceID, Title: "Startup PM Resume", ContactProfileID: &contactID, CreatedBy: DemoUserID, CreatedAt: ago(3 * 24 * time.Hour), UpdatedAt: ago(24 * time.Hour)},
	}
	for _, resume := range resumes {
		m.resumes[resume.ID] = resume
	}

	m.resumeSections = []resumeSectionLink{
		{"resume-swe", "section-summary", 0},
		{"resume-swe", "section-exp", 1},
		{"resume-swe", "section-edu", 2},
		{"resume-swe", "section-skills", 3},
		{"resume-swe", "section-lang", 4},
		{"resume-startup", "section-summary", 0},
		{"resume-startup", "section-exp", 1},
		{"resume-startup", "section-skills", 2},
	}

	m.sectionItemLinks = []sectionItemLink{
		{"section-summary", "item-summary", 0},
		{"section-exp", "item-acme", 0},
		{"section-exp", "item-startup", 1},
		{"section-edu", "item-msc", 0},
		{"section-skills", "item-skill-ts", 0},
		{"section-skills", "item-skill-go", 1},
		{"section-skills", "item-skill-react", 2},
		{"section-lang", "item-lang-en", 0},
		{"section-lang", "item-lang-de", 1},
	}

	m.itemVisibilityLinks = []resumeItemVisibilityLink{
		{resumeID: "resume-swe", sectionID: "section-summary", sectionItemID: "item-summary", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-exp", sectionItemID: "item-acme", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-exp", sectionItemID: "item-startup", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-edu", sectionItemID: "item-msc", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-skills", sectionItemID: "item-skill-ts", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-skills", sectionItemID: "item-skill-go", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-skills", sectionItemID: "item-skill-react", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-lang", sectionItemID: "item-lang-en", showInPreview: true},
		{resumeID: "resume-swe", sectionID: "section-lang", sectionItemID: "item-lang-de", showInPreview: true},
		{resumeID: "resume-startup", sectionID: "section-summary", sectionItemID: "item-summary", showInPreview: true},
		{resumeID: "resume-startup", sectionID: "section-exp", sectionItemID: "item-startup", showInPreview: true},
		{resumeID: "resume-startup", sectionID: "section-skills", sectionItemID: "item-skill-ts", showInPreview: true},
		{resumeID: "resume-startup", sectionID: "section-skills", sectionItemID: "item-skill-go", showInPreview: true},
	}

	m.resumeSettings["resume-swe"] = &model.ResumeSettings{
		ResumeID: "resume-swe", ThemeID: "theme-modern", FontSize: model.FontSizeM,
		PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
	}
	m.resumeSettings["resume-startup"] = &model.ResumeSettings{
		ResumeID: "resume-startup", ThemeID: "theme-compact", FontSize: model.FontSizeS,
		PageFormat: model.PageFormatLetter, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
	}

	seedTwinEntries(m, now)
}

func (m *Memory) User() *model.User {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return cloneUser(m.user)
}

func (m *Memory) Workspace() *model.Workspace {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return cloneWorkspace(m.workspace)
}

func (m *Memory) Thread() *model.AssistantThread {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return cloneThread(m.threads[DemoThreadID])
}

func (m *Memory) ListAssistantThreads() []*model.AssistantThread {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.AssistantThread, 0, len(m.threads))
	for _, thread := range m.threads {
		if thread.WorkspaceID != DemoWorkspaceID {
			continue
		}
		t := cloneThread(thread)
		t.Preview = strPtr(m.threadPreviewLocked(thread.ID))
		out = append(out, t)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt > out[j].UpdatedAt
	})
	return out
}

func (m *Memory) GetAssistantThread(id string) (*model.AssistantThread, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	thread, ok := m.threads[id]
	if !ok || thread.WorkspaceID != DemoWorkspaceID {
		return nil, ErrNotFound
	}
	t := cloneThread(thread)
	t.Preview = strPtr(m.threadPreviewLocked(id))
	return t, nil
}

func (m *Memory) CreateAssistantThread() (*model.AssistantThread, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	id := "thread-" + uuid.NewString()[:8]
	thread := &model.AssistantThread{
		ID:          id,
		WorkspaceID: DemoWorkspaceID,
		CreatedAt:   now,
		UpdatedAt:   now,
		Preview:     strPtr(""),
	}
	m.threads[id] = thread
	return cloneThread(thread), nil
}

func (m *Memory) DeleteAssistantThread(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	thread, ok := m.threads[id]
	if !ok || thread.WorkspaceID != DemoWorkspaceID {
		return ErrNotFound
	}
	delete(m.threads, id)

	messageIDs := make(map[string]struct{})
	filteredMessages := m.messages[:0]
	for _, msg := range m.messages {
		if msg.ThreadID == id {
			messageIDs[msg.ID] = struct{}{}
			continue
		}
		filteredMessages = append(filteredMessages, msg)
	}
	m.messages = filteredMessages

	filteredLogs := m.actionLogs[:0]
	for _, log := range m.actionLogs {
		if _, ok := messageIDs[log.MessageID]; ok {
			continue
		}
		filteredLogs = append(filteredLogs, log)
	}
	m.actionLogs = filteredLogs
	return nil
}

func (m *Memory) threadPreviewLocked(threadID string) string {
	for i := len(m.messages) - 1; i >= 0; i-- {
		msg := m.messages[i]
		if msg.ThreadID != threadID || msg.Role != model.AssistantMessageRoleUser {
			continue
		}
		content := strings.TrimSpace(msg.Content)
		if len(content) > 80 {
			return content[:80]
		}
		return content
	}
	return ""
}

func (m *Memory) ListThemes() []*model.CvTheme {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.CvTheme, len(m.themes))
	for i, t := range m.themes {
		out[i] = cloneTheme(t)
	}
	return out
}

func (m *Memory) GetTheme(id string) (*model.CvTheme, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, t := range m.themes {
		if t.ID == id {
			return cloneTheme(t), nil
		}
	}
	return nil, ErrNotFound
}

func (m *Memory) ListResumes() []*model.Resume {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.Resume, 0, len(m.resumes))
	for _, r := range m.resumes {
		out = append(out, cloneResume(r))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt > out[j].UpdatedAt })
	return out
}

func (m *Memory) GetResume(id string) (*model.Resume, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.resumes[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneResume(r), nil
}

func (m *Memory) SaveResume(resume *model.Resume) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.resumes[resume.ID] = cloneResume(resume)
}

func (m *Memory) ListSections(sectionType *model.SectionType) []*model.Section {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.Section, 0)
	for _, s := range m.sections {
		if sectionType != nil && s.Type != *sectionType {
			continue
		}
		out = append(out, cloneSection(s))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Title < out[j].Title })
	return out
}

func (m *Memory) GetSection(id string) (*model.Section, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sections[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneSection(s), nil
}

func (m *Memory) ListSectionItems(sectionType *model.SectionType) []*model.SectionItem {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.SectionItem, 0)
	for _, item := range m.sectionItems {
		if sectionType != nil && item.Type != *sectionType {
			continue
		}
		out = append(out, withDefaultShowInPreview(cloneSectionItem(item)))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Headline < out[j].Headline })
	return out
}

func (m *Memory) GetSectionItem(id string) (*model.SectionItem, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	item, ok := m.sectionItems[id]
	if !ok {
		return nil, ErrNotFound
	}
	return withDefaultShowInPreview(cloneSectionItem(item)), nil
}

func (m *Memory) SaveSectionItem(item *model.SectionItem) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sectionItems[item.ID] = cloneSectionItem(item)
}

func (m *Memory) ListContactProfiles() []*model.ContactProfile {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.ContactProfile, 0, len(m.contactProfiles))
	for _, p := range m.contactProfiles {
		out = append(out, cloneContactProfile(p))
	}
	return out
}

func (m *Memory) GetContactProfile(id string) (*model.ContactProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.contactProfiles[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneContactProfile(p), nil
}

func (m *Memory) GetResumeSettings(resumeID string) *model.ResumeSettings {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.resumeSettings[resumeID]; ok {
		return cloneResumeSettings(s)
	}
	return &model.ResumeSettings{
		ResumeID: resumeID, ThemeID: "theme-modern", FontSize: model.FontSizeM,
		PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
	}
}

func (m *Memory) UpdateResumeSettings(resumeID string, update func(*model.ResumeSettings)) (*model.ResumeSettings, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.resumes[resumeID]; !ok {
		return nil, ErrNotFound
	}

	settings := m.resumeSettings[resumeID]
	if settings == nil {
		settings = &model.ResumeSettings{
			ResumeID: resumeID, ThemeID: "theme-modern", FontSize: model.FontSizeM,
			PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
		}
	} else {
		settings = cloneResumeSettings(settings)
	}

	update(settings)
	m.resumeSettings[resumeID] = settings
	return cloneResumeSettings(settings), nil
}

func (m *Memory) itemVisibilityOnResume(resumeID, sectionID, sectionItemID string) (show bool, onResume bool) {
	for _, link := range m.itemVisibilityLinks {
		if link.resumeID == resumeID && link.sectionID == sectionID && link.sectionItemID == sectionItemID {
			return link.showInPreview, true
		}
	}
	return false, false
}

func (m *Memory) UpdateResumeSectionItemVisibility(
	resumeID, sectionID, sectionItemID string,
	showInPreview bool,
) (*model.ResumeWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.resumes[resumeID]; !ok {
		return nil, ErrNotFound
	}
	if _, ok := m.sections[sectionID]; !ok {
		return nil, ErrNotFound
	}
	if _, ok := m.sectionItems[sectionItemID]; !ok {
		return nil, ErrNotFound
	}

	found := false
	for i, link := range m.itemVisibilityLinks {
		if link.resumeID == resumeID && link.sectionID == sectionID && link.sectionItemID == sectionItemID {
			m.itemVisibilityLinks[i].showInPreview = showInPreview
			found = true
			break
		}
	}
	if !found {
		m.itemVisibilityLinks = append(m.itemVisibilityLinks, resumeItemVisibilityLink{
			resumeID: resumeID, sectionID: sectionID, sectionItemID: sectionItemID,
			showInPreview: showInPreview,
		})
	}

	return m.resumeWithContentLocked(resumeID)
}

func (m *Memory) AddResumeSectionItem(
	resumeID, sectionID string,
	headline, body string,
	metadata map[string]any,
) (*model.ResumeWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	resume, ok := m.resumes[resumeID]
	if !ok {
		return nil, ErrNotFound
	}
	section, ok := m.sections[sectionID]
	if !ok {
		return nil, ErrNotFound
	}

	linked := false
	for _, link := range m.resumeSections {
		if link.resumeID == resumeID && link.sectionID == sectionID {
			linked = true
			break
		}
	}
	if !linked {
		if _, ok := m.resumes[resumeID]; !ok {
			return nil, ErrNotFound
		}
		if _, ok := m.sections[sectionID]; !ok {
			return nil, ErrNotFound
		}
		maxOrder := -1
		for _, link := range m.resumeSections {
			if link.resumeID == resumeID && link.sortOrder > maxOrder {
				maxOrder = link.sortOrder
			}
		}
		m.resumeSections = append(m.resumeSections, resumeSectionLink{
			resumeID: resumeID, sectionID: sectionID, sortOrder: maxOrder + 1,
		})
		linked = true
	}
	if !linked {
		return nil, ErrNotFound
	}

	trimmedHeadline := strings.TrimSpace(headline)
	if trimmedHeadline == "" {
		trimmedHeadline = defaultSectionItemHeadline(section.Type)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	itemID := uuid.NewString()
	itemMetadata := map[string]any{}
	if metadata != nil {
		for k, v := range metadata {
			if v != nil {
				itemMetadata[k] = v
			}
		}
	}
	item := &model.SectionItem{
		ID:          itemID,
		WorkspaceID: DemoWorkspaceID,
		Type:        section.Type,
		Headline:    trimmedHeadline,
		Body:        strings.TrimSpace(body),
		Metadata:    itemMetadata,
		CreatedBy:   DemoUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.sectionItems[itemID] = cloneSectionItem(item)

	maxOrder := -1
	for _, link := range m.sectionItemLinks {
		if link.sectionID == sectionID && link.sortOrder > maxOrder {
			maxOrder = link.sortOrder
		}
	}
	m.sectionItemLinks = append(m.sectionItemLinks, sectionItemLink{
		sectionID: sectionID, sectionItemID: itemID, sortOrder: maxOrder + 1,
	})

	m.itemVisibilityLinks = appendNewItemVisibility(m.itemVisibilityLinks, m.resumeSections, resumeID, sectionID, itemID)

	resume.UpdatedAt = now
	m.resumes[resumeID] = cloneResume(resume)
	section.UpdatedAt = now
	m.sections[sectionID] = cloneSection(section)

	return m.resumeWithContentLocked(resumeID)
}

func (m *Memory) UpdateResumeSectionItem(
	resumeID, sectionID, sectionItemID string,
	headline, body *string,
	metadata map[string]any,
) (*model.ResumeWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.resumes[resumeID]; !ok {
		return nil, ErrNotFound
	}
	if _, ok := m.sections[sectionID]; !ok {
		return nil, ErrNotFound
	}
	item, ok := m.sectionItems[sectionItemID]
	if !ok {
		return nil, ErrNotFound
	}

	linked := false
	for _, link := range m.sectionItemLinks {
		if link.sectionID == sectionID && link.sectionItemID == sectionItemID {
			linked = true
			break
		}
	}
	if !linked {
		return nil, ErrNotFound
	}

	now := time.Now().UTC().Format(time.RFC3339)
	if headline != nil {
		item.Headline = strings.TrimSpace(*headline)
	}
	if body != nil {
		item.Body = strings.TrimSpace(*body)
	}
	if metadata != nil {
		item.Metadata = mergeMetadata(item.Metadata, metadata)
	}
	item.UpdatedAt = now
	m.sectionItems[sectionItemID] = cloneSectionItem(item)

	if resume := m.resumes[resumeID]; resume != nil {
		resume.UpdatedAt = now
		m.resumes[resumeID] = cloneResume(resume)
	}
	if section := m.sections[sectionID]; section != nil {
		section.UpdatedAt = now
		m.sections[sectionID] = cloneSection(section)
	}

	return m.resumeWithContentLocked(resumeID)
}

func (m *Memory) UpdateContactProfile(
	resumeID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL *string,
) (*model.ResumeWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	resume, ok := m.resumes[resumeID]
	if !ok {
		return nil, ErrNotFound
	}

	now := time.Now().UTC().Format(time.RFC3339)
	var profile *model.ContactProfile

	if resume.ContactProfileID != nil {
		profile = m.contactProfiles[*resume.ContactProfileID]
	}

	if profile == nil {
		name := "Your name"
		if fullName != nil {
			if trimmed := strings.TrimSpace(*fullName); trimmed != "" {
				name = trimmed
			}
		}
		id := uuid.NewString()
		profile = &model.ContactProfile{
			ID:          id,
			WorkspaceID: resume.WorkspaceID,
			FullName:    name,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		m.contactProfiles[id] = profile
		resume.ContactProfileID = &id
	}

	if fullName != nil {
		if trimmed := strings.TrimSpace(*fullName); trimmed != "" {
			profile.FullName = trimmed
		}
	}
	if headline != nil {
		profile.Headline = trimmedStringPtr(*headline)
	}
	if email != nil {
		profile.Email = trimmedStringPtr(*email)
	}
	if phone != nil {
		profile.Phone = trimmedStringPtr(*phone)
	}
	if location != nil {
		profile.Location = trimmedStringPtr(*location)
	}
	if website != nil {
		profile.Website = trimmedStringPtr(*website)
	}
	if linkedIn != nil {
		profile.LinkedIn = trimmedStringPtr(*linkedIn)
	}
	if github != nil {
		profile.Github = trimmedStringPtr(*github)
	}
	if photoURL != nil {
		if trimmed := strings.TrimSpace(*photoURL); trimmed == "" {
			profile.PhotoURL = nil
		} else {
			profile.PhotoURL = &trimmed
		}
	}

	profile.UpdatedAt = now
	m.contactProfiles[profile.ID] = cloneContactProfile(profile)
	resume.UpdatedAt = now
	m.resumes[resumeID] = cloneResume(resume)

	return m.resumeWithContentLocked(resumeID)
}

func (m *Memory) ResumeWithContent(resumeID string) (*model.ResumeWithContent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.resumeWithContentLocked(resumeID)
}

func (m *Memory) resumeWithContentLocked(resumeID string) (*model.ResumeWithContent, error) {
	resume, ok := m.resumes[resumeID]
	if !ok {
		return nil, ErrNotFound
	}

	settings := m.resumeSettings[resumeID]
	if settings == nil {
		settings = &model.ResumeSettings{
			ResumeID: resumeID, ThemeID: "theme-modern", FontSize: model.FontSizeM,
			PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
		}
	}

	var theme *model.CvTheme
	for _, t := range m.themes {
		if t.ID == settings.ThemeID {
			theme = cloneTheme(t)
			break
		}
	}
	if theme == nil && len(m.themes) > 1 {
		theme = cloneTheme(m.themes[1])
	}

	var contact *model.ContactProfile
	if resume.ContactProfileID != nil {
		contact = cloneContactProfile(m.contactProfiles[*resume.ContactProfileID])
	}

	sectionLinks := filterResumeSections(m.resumeSections, resumeID)
	sectionsWithItems := make([]*model.SectionWithItems, 0, len(sectionLinks))
	for _, link := range sectionLinks {
		section := m.sections[link.sectionID]
		if section == nil {
			continue
		}
		itemLinks := filterSectionItems(m.sectionItemLinks, link.sectionID)
		items := make([]*model.SectionItem, 0, len(itemLinks))
		for _, il := range itemLinks {
			if item := m.sectionItems[il.sectionItemID]; item != nil {
				show, onResume := m.itemVisibilityOnResume(resumeID, link.sectionID, il.sectionItemID)
				if !onResume {
					show = false
				}
				cloned := cloneSectionItem(item)
				cloned.ShowInPreview = show
				items = append(items, cloned)
			}
		}
		sectionsWithItems = append(sectionsWithItems, &model.SectionWithItems{
			Section: cloneSection(section),
			Items:   items,
		})
	}

	return &model.ResumeWithContent{
		Resume:         cloneResume(resume),
		ContactProfile: contact,
		Settings:       cloneResumeSettings(settings),
		Theme:          theme,
		Sections:       sectionsWithItems,
	}, nil
}

func (m *Memory) SectionItemUsage(itemID string) (*model.SectionItemUsage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	item, ok := m.sectionItems[itemID]
	if !ok {
		return nil, ErrNotFound
	}

	sectionIDs := make([]string, 0)
	for _, link := range m.sectionItemLinks {
		if link.sectionItemID == itemID {
			sectionIDs = append(sectionIDs, link.sectionID)
		}
	}

	sections := make([]*model.Section, 0, len(sectionIDs))
	resumeIDSet := map[string]struct{}{}
	for _, sid := range sectionIDs {
		if s := m.sections[sid]; s != nil {
			sections = append(sections, cloneSection(s))
		}
		for _, rl := range m.resumeSections {
			if rl.sectionID == sid {
				resumeIDSet[rl.resumeID] = struct{}{}
			}
		}
	}

	resumes := make([]*model.Resume, 0, len(resumeIDSet))
	for rid := range resumeIDSet {
		if r := m.resumes[rid]; r != nil {
			resumes = append(resumes, cloneResume(r))
		}
	}

	return &model.SectionItemUsage{
		SectionItem: withDefaultShowInPreview(cloneSectionItem(item)),
		Sections:    sections,
		Resumes:     resumes,
	}, nil
}

func (m *Memory) DeleteSectionItem(sectionItemID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.sectionItems[sectionItemID]; !ok {
		return ErrNotFound
	}

	links := make([]sectionItemLink, 0, len(m.sectionItemLinks))
	for _, link := range m.sectionItemLinks {
		if link.sectionItemID != sectionItemID {
			links = append(links, link)
		}
	}
	m.sectionItemLinks = links

	visibility := make([]resumeItemVisibilityLink, 0, len(m.itemVisibilityLinks))
	for _, link := range m.itemVisibilityLinks {
		if link.sectionItemID != sectionItemID {
			visibility = append(visibility, link)
		}
	}
	m.itemVisibilityLinks = visibility

	delete(m.sectionItems, sectionItemID)
	return nil
}

func (m *Memory) WorkspaceStats() *model.WorkspaceStats {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return &model.WorkspaceStats{
		ResumeCount:      len(m.resumes),
		SectionCount:     len(m.sections),
		SectionItemCount: len(m.sectionItems),
	}
}

func (m *Memory) ResumesForSection(sectionID string) ([]*model.Resume, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if _, ok := m.sections[sectionID]; !ok {
		return nil, ErrNotFound
	}
	resumeIDSet := map[string]struct{}{}
	for _, rl := range m.resumeSections {
		if rl.sectionID == sectionID {
			resumeIDSet[rl.resumeID] = struct{}{}
		}
	}
	resumes := make([]*model.Resume, 0, len(resumeIDSet))
	for rid := range resumeIDSet {
		if r := m.resumes[rid]; r != nil {
			resumes = append(resumes, cloneResume(r))
		}
	}
	return resumes, nil
}

func (m *Memory) SectionItemsForSection(sectionID string) ([]*model.SectionItem, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if _, ok := m.sections[sectionID]; !ok {
		return nil, ErrNotFound
	}
	itemLinks := filterSectionItems(m.sectionItemLinks, sectionID)
	items := make([]*model.SectionItem, 0, len(itemLinks))
	for _, il := range itemLinks {
		if item := m.sectionItems[il.sectionItemID]; item != nil {
			items = append(items, withDefaultShowInPreview(cloneSectionItem(item)))
		}
	}
	return items, nil
}

func (m *Memory) ListAssistantMessages(threadID string, limit int) []*model.AssistantMessage {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if _, ok := m.threads[threadID]; !ok {
		return nil
	}
	threadMessages := make([]*model.AssistantMessage, 0)
	for _, msg := range m.messages {
		if msg.ThreadID == threadID {
			threadMessages = append(threadMessages, msg)
		}
	}
	if limit <= 0 || limit > len(threadMessages) {
		limit = len(threadMessages)
	}
	start := len(threadMessages) - limit
	if start < 0 {
		start = 0
	}
	out := make([]*model.AssistantMessage, 0, limit)
	for _, msg := range threadMessages[start:] {
		out = append(out, cloneAssistantMessage(msg))
	}
	return out
}

func (m *Memory) AppendAssistantMessage(msg *model.AssistantMessage) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, cloneAssistantMessage(msg))
	if thread, ok := m.threads[msg.ThreadID]; ok {
		thread.UpdatedAt = msg.CreatedAt
	}
}

func (m *Memory) AppendActionLog(log *model.AssistantActionLog) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.actionLogs = append(m.actionLogs, cloneActionLog(log))
}

func (m *Memory) DuplicateResume(sourceID string) (*model.Resume, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	source, ok := m.resumes[sourceID]
	if !ok {
		return nil, ErrNotFound
	}

	now := time.Now().UTC().Format(time.RFC3339)
	newID := uuid.NewString()
	newResume := &model.Resume{
		ID:          newID,
		WorkspaceID: source.WorkspaceID,
		Title:       source.Title + " (copy)",
		CreatedBy:   source.CreatedBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if source.ContactProfileID != nil {
		contactID := *source.ContactProfileID
		newResume.ContactProfileID = &contactID
	}
	m.resumes[newID] = cloneResume(newResume)

	if settings := m.resumeSettings[sourceID]; settings != nil {
		copied := cloneResumeSettings(settings)
		copied.ResumeID = newID
		m.resumeSettings[newID] = copied
	} else {
		m.resumeSettings[newID] = &model.ResumeSettings{
			ResumeID: newID, ThemeID: "theme-modern", FontSize: model.FontSizeM,
			PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
		}
	}

	for _, link := range filterResumeSections(m.resumeSections, sourceID) {
		m.resumeSections = append(m.resumeSections, resumeSectionLink{
			resumeID: newID, sectionID: link.sectionID, sortOrder: link.sortOrder,
		})
	}

	for _, link := range m.itemVisibilityLinks {
		if link.resumeID == sourceID {
			m.itemVisibilityLinks = append(m.itemVisibilityLinks, resumeItemVisibilityLink{
				resumeID: newID, sectionID: link.sectionID, sectionItemID: link.sectionItemID,
				showInPreview: link.showInPreview,
			})
		}
	}

	return cloneResume(newResume), nil
}

func (m *Memory) DeleteResume(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.resumes[id]; !ok {
		return ErrNotFound
	}

	delete(m.resumes, id)
	delete(m.resumeSettings, id)

	sectionLinks := make([]resumeSectionLink, 0, len(m.resumeSections))
	for _, link := range m.resumeSections {
		if link.resumeID != id {
			sectionLinks = append(sectionLinks, link)
		}
	}
	m.resumeSections = sectionLinks

	visibilityLinks := make([]resumeItemVisibilityLink, 0, len(m.itemVisibilityLinks))
	for _, link := range m.itemVisibilityLinks {
		if link.resumeID != id {
			visibilityLinks = append(visibilityLinks, link)
		}
	}
	m.itemVisibilityLinks = visibilityLinks

	return nil
}

func (m *Memory) CreateResume(title string) *model.Resume {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.NewString()
	resume := &model.Resume{
		ID:          id,
		WorkspaceID: DemoWorkspaceID,
		Title:       title,
		CreatedBy:   DemoUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.resumes[id] = cloneResume(resume)
	m.resumeSettings[id] = &model.ResumeSettings{
		ResumeID: id, ThemeID: "theme-modern", FontSize: model.FontSizeM,
		PageFormat: model.PageFormatA4, MarginHorizontalMm: 12, MarginVerticalMm: 12, ShowPhoto: false, Locale: "en-US",
	}

	specs := resumeDefaultSectionSpecs()
	for i, spec := range specs {
		for _, section := range m.sections {
			if section.Type != spec.sectionType {
				continue
			}
			m.resumeSections = append(m.resumeSections, resumeSectionLink{
				resumeID: id, sectionID: section.ID, sortOrder: i,
			})
			for _, itemLink := range m.sectionItemLinks {
				if itemLink.sectionID != section.ID {
					continue
				}
				m.itemVisibilityLinks = append(m.itemVisibilityLinks, resumeItemVisibilityLink{
					resumeID: id, sectionID: section.ID, sectionItemID: itemLink.sectionItemID,
					showInPreview: false,
				})
			}
			break
		}
	}

	return cloneResume(resume)
}

