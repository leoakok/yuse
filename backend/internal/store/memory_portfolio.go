package store

import (
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (m *Memory) ListPortfolios() []*model.Portfolio {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.Portfolio, 0, len(m.portfolios))
	for _, pf := range m.portfolios {
		out = append(out, clonePortfolio(pf))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt > out[j].UpdatedAt })
	return out
}

func (m *Memory) GetPortfolio(id string) (*model.Portfolio, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pf, ok := m.portfolios[id]
	if !ok {
		return nil, ErrNotFound
	}
	return clonePortfolio(pf), nil
}

func (m *Memory) SavePortfolio(portfolio *model.Portfolio) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.portfolios[portfolio.ID] = clonePortfolio(portfolio)
}

func (m *Memory) GetPortfolioSettings(portfolioID string) *model.PortfolioSettings {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.portfolioSettings[portfolioID]; ok {
		return clonePortfolioSettings(s)
	}
	return defaultPortfolioSettings(portfolioID)
}

func (m *Memory) UpdatePortfolioSettings(portfolioID string, update func(*model.PortfolioSettings)) (*model.PortfolioSettings, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[portfolioID]; !ok {
		return nil, ErrNotFound
	}
	settings := m.portfolioSettings[portfolioID]
	if settings == nil {
		settings = defaultPortfolioSettings(portfolioID)
	}
	settings = clonePortfolioSettings(settings)
	update(settings)
	m.portfolioSettings[portfolioID] = settings
	return clonePortfolioSettings(settings), nil
}

func (m *Memory) PortfolioWithContent(portfolioID string) (*model.PortfolioWithContent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) portfolioWithContentLocked(portfolioID string) (*model.PortfolioWithContent, error) {
	portfolio, ok := m.portfolios[portfolioID]
	if !ok {
		return nil, ErrNotFound
	}
	settings := m.portfolioSettings[portfolioID]
	if settings == nil {
		settings = defaultPortfolioSettings(portfolioID)
	}
	var contact *model.ContactProfile
	if portfolio.ContactProfileID != nil {
		contact = cloneContactProfile(m.contactProfiles[*portfolio.ContactProfileID])
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
	return &model.PortfolioWithContent{
		Portfolio:      clonePortfolio(portfolio),
		ContactProfile: contact,
		Settings:       clonePortfolioSettings(settings),
		Theme:          theme,
		Projects:       clonePortfolioProjects(filterPortfolioProjects(m.portfolioProjects, portfolioID)),
		Skills:         clonePortfolioSkills(filterPortfolioSkills(m.portfolioSkills, portfolioID)),
		Testimonials:   clonePortfolioTestimonials(filterPortfolioTestimonials(m.portfolioTestimonials, portfolioID)),
	}, nil
}

func (m *Memory) AddPortfolioProject(input model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[input.PortfolioID]; !ok {
		return nil, ErrNotFound
	}
	now := formatTime(time.Now().UTC())
	id := uuid.NewString()
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Untitled project"
	}
	tagline := ""
	if input.Tagline != nil {
		tagline = strings.TrimSpace(*input.Tagline)
	}
	techStack := input.TechStack
	if techStack == nil {
		techStack = []string{}
	}
	featured := false
	if input.Featured != nil {
		featured = *input.Featured
	}
	maxSort := maxPortfolioProjectSort(m.portfolioProjects, input.PortfolioID)
	proj := &model.PortfolioProject{
		ID:            id,
		PortfolioID:   input.PortfolioID,
		Title:         title,
		Tagline:       tagline,
		TechStack:     append([]string(nil), techStack...),
		Featured:      featured,
		ShowInPreview: true,
		SortOrder:     maxSort + 1,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if input.Problem != nil {
		proj.Problem = strings.TrimSpace(*input.Problem)
	}
	if input.Approach != nil {
		proj.Approach = strings.TrimSpace(*input.Approach)
	}
	if input.Outcome != nil {
		proj.Outcome = strings.TrimSpace(*input.Outcome)
	}
	if input.LiveURL != nil {
		proj.LiveURL = trimmedStringPtr(*input.LiveURL)
	}
	if input.RepoURL != nil {
		proj.RepoURL = trimmedStringPtr(*input.RepoURL)
	}
	if input.ImageURL != nil {
		proj.ImageURL = trimmedStringPtr(*input.ImageURL)
	}
	m.portfolioProjects[id] = proj
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) UpdatePortfolioProject(input model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	proj, ok := m.portfolioProjects[input.ProjectID]
	if !ok || proj.PortfolioID != input.PortfolioID {
		return nil, ErrNotFound
	}
	if input.Title != nil {
		proj.Title = strings.TrimSpace(*input.Title)
	}
	if input.Tagline != nil {
		proj.Tagline = strings.TrimSpace(*input.Tagline)
	}
	if input.Problem != nil {
		proj.Problem = strings.TrimSpace(*input.Problem)
	}
	if input.Approach != nil {
		proj.Approach = strings.TrimSpace(*input.Approach)
	}
	if input.Outcome != nil {
		proj.Outcome = strings.TrimSpace(*input.Outcome)
	}
	if input.TechStack != nil {
		proj.TechStack = append([]string(nil), input.TechStack...)
	}
	if input.LiveURL != nil {
		proj.LiveURL = trimmedStringPtr(*input.LiveURL)
	}
	if input.RepoURL != nil {
		proj.RepoURL = trimmedStringPtr(*input.RepoURL)
	}
	if input.ImageURL != nil {
		proj.ImageURL = trimmedStringPtr(*input.ImageURL)
	}
	if input.Featured != nil {
		proj.Featured = *input.Featured
	}
	if input.ShowInPreview != nil {
		proj.ShowInPreview = *input.ShowInPreview
	}
	proj.UpdatedAt = formatTime(time.Now().UTC())
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) DeletePortfolioProject(portfolioID, projectID string) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	proj, ok := m.portfolioProjects[projectID]
	if !ok || proj.PortfolioID != portfolioID {
		return nil, ErrNotFound
	}
	delete(m.portfolioProjects, projectID)
	m.touchPortfolioLocked(portfolioID)
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) SetPortfolioProjectVisibility(portfolioID, projectID string, showInPreview bool) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	proj, ok := m.portfolioProjects[projectID]
	if !ok || proj.PortfolioID != portfolioID {
		return nil, ErrNotFound
	}
	proj.ShowInPreview = showInPreview
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) AddPortfolioSkill(input model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[input.PortfolioID]; !ok {
		return nil, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, ErrNotFound
	}
	id := uuid.NewString()
	maxSort := maxPortfolioSkillSort(m.portfolioSkills, input.PortfolioID)
	skill := &model.PortfolioSkill{
		ID:            id,
		PortfolioID:   input.PortfolioID,
		Name:          name,
		ShowInPreview: true,
		SortOrder:     maxSort + 1,
	}
	if input.Category != nil {
		skill.Category = trimmedStringPtr(*input.Category)
	}
	m.portfolioSkills[id] = skill
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) UpdatePortfolioSkill(input model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	skill, ok := m.portfolioSkills[input.SkillID]
	if !ok || skill.PortfolioID != input.PortfolioID {
		return nil, ErrNotFound
	}
	if input.Name != nil {
		skill.Name = strings.TrimSpace(*input.Name)
	}
	if input.Category != nil {
		skill.Category = trimmedStringPtr(*input.Category)
	}
	if input.ShowInPreview != nil {
		skill.ShowInPreview = *input.ShowInPreview
	}
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) DeletePortfolioSkill(portfolioID, skillID string) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	skill, ok := m.portfolioSkills[skillID]
	if !ok || skill.PortfolioID != portfolioID {
		return nil, ErrNotFound
	}
	delete(m.portfolioSkills, skillID)
	m.touchPortfolioLocked(portfolioID)
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) AddPortfolioTestimonial(input model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[input.PortfolioID]; !ok {
		return nil, ErrNotFound
	}
	quote := strings.TrimSpace(input.Quote)
	if quote == "" {
		return nil, ErrNotFound
	}
	id := uuid.NewString()
	maxSort := maxPortfolioTestimonialSort(m.portfolioTestimonials, input.PortfolioID)
	t := &model.PortfolioTestimonial{
		ID:            id,
		PortfolioID:   input.PortfolioID,
		Quote:         quote,
		ShowInPreview: true,
		SortOrder:     maxSort + 1,
	}
	if input.Author != nil {
		t.Author = strings.TrimSpace(*input.Author)
	}
	if input.Role != nil {
		t.Role = strings.TrimSpace(*input.Role)
	}
	m.portfolioTestimonials[id] = t
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) UpdatePortfolioTestimonial(input model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.portfolioTestimonials[input.TestimonialID]
	if !ok || t.PortfolioID != input.PortfolioID {
		return nil, ErrNotFound
	}
	if input.Quote != nil {
		t.Quote = strings.TrimSpace(*input.Quote)
	}
	if input.Author != nil {
		t.Author = strings.TrimSpace(*input.Author)
	}
	if input.Role != nil {
		t.Role = strings.TrimSpace(*input.Role)
	}
	if input.ShowInPreview != nil {
		t.ShowInPreview = *input.ShowInPreview
	}
	m.touchPortfolioLocked(input.PortfolioID)
	return m.portfolioWithContentLocked(input.PortfolioID)
}

func (m *Memory) DeletePortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.portfolioTestimonials[testimonialID]
	if !ok || t.PortfolioID != portfolioID {
		return nil, ErrNotFound
	}
	delete(m.portfolioTestimonials, testimonialID)
	m.touchPortfolioLocked(portfolioID)
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) UpdatePortfolioContactProfile(
	portfolioID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL, linkedinPhotoURL, githubPhotoURL, ogImageURL, faviconURL *string,
) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	portfolio, ok := m.portfolios[portfolioID]
	if !ok {
		return nil, ErrNotFound
	}
	now := formatTime(time.Now().UTC())
	var profile *model.ContactProfile
	if portfolio.ContactProfileID != nil {
		profile = m.contactProfiles[*portfolio.ContactProfileID]
	}
	if profile == nil {
		name := "Your name"
		if fullName != nil && strings.TrimSpace(*fullName) != "" {
			name = strings.TrimSpace(*fullName)
		}
		id := uuid.NewString()
		profile = &model.ContactProfile{
			ID:          id,
			WorkspaceID: portfolio.WorkspaceID,
			FullName:    name,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		portfolio.ContactProfileID = &id
	}
	if fullName != nil && strings.TrimSpace(*fullName) != "" {
		profile.FullName = strings.TrimSpace(*fullName)
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
		profile.PhotoURL = trimmedStringPtr(*photoURL)
	}
	if linkedinPhotoURL != nil {
		profile.LinkedinPhotoURL = trimmedStringPtr(*linkedinPhotoURL)
	}
	if githubPhotoURL != nil {
		profile.GithubPhotoURL = trimmedStringPtr(*githubPhotoURL)
	}
	if ogImageURL != nil {
		profile.OgImageURL = trimmedStringPtr(*ogImageURL)
	}
	if faviconURL != nil {
		profile.FaviconURL = trimmedStringPtr(*faviconURL)
	}
	profile.UpdatedAt = now
	m.contactProfiles[profile.ID] = cloneContactProfile(profile)
	portfolio.UpdatedAt = now
	m.portfolios[portfolioID] = clonePortfolio(portfolio)
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) DuplicatePortfolio(sourceID string) (*model.Portfolio, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	source, ok := m.portfolios[sourceID]
	if !ok {
		return nil, ErrNotFound
	}
	now := formatTime(time.Now().UTC())
	newID := uuid.NewString()
	dup := &model.Portfolio{
		ID:          newID,
		WorkspaceID: source.WorkspaceID,
		Title:       source.Title + " (copy)",
		Tagline:     source.Tagline,
		About:       source.About,
		CreatedBy:   source.CreatedBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if source.ContactProfileID != nil {
		contactID := *source.ContactProfileID
		dup.ContactProfileID = &contactID
	}
	m.portfolios[newID] = clonePortfolio(dup)
	if settings := m.portfolioSettings[sourceID]; settings != nil {
		s := clonePortfolioSettings(settings)
		s.PortfolioID = newID
		m.portfolioSettings[newID] = s
	} else {
		m.portfolioSettings[newID] = defaultPortfolioSettings(newID)
	}
	for _, proj := range filterPortfolioProjects(m.portfolioProjects, sourceID) {
		copyProj := clonePortfolioProject(proj)
		copyProj.ID = uuid.NewString()
		copyProj.PortfolioID = newID
		m.portfolioProjects[copyProj.ID] = copyProj
	}
	for _, skill := range filterPortfolioSkills(m.portfolioSkills, sourceID) {
		copySkill := clonePortfolioSkill(skill)
		copySkill.ID = uuid.NewString()
		copySkill.PortfolioID = newID
		m.portfolioSkills[copySkill.ID] = copySkill
	}
	for _, t := range filterPortfolioTestimonials(m.portfolioTestimonials, sourceID) {
		copyT := clonePortfolioTestimonial(t)
		copyT.ID = uuid.NewString()
		copyT.PortfolioID = newID
		m.portfolioTestimonials[copyT.ID] = copyT
	}
	return clonePortfolio(dup), nil
}

func (m *Memory) DeletePortfolio(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[id]; !ok {
		return ErrNotFound
	}
	delete(m.portfolios, id)
	delete(m.portfolioSettings, id)
	for pid, proj := range m.portfolioProjects {
		if proj.PortfolioID == id {
			delete(m.portfolioProjects, pid)
		}
	}
	for sid, skill := range m.portfolioSkills {
		if skill.PortfolioID == id {
			delete(m.portfolioSkills, sid)
		}
	}
	for tid, t := range m.portfolioTestimonials {
		if t.PortfolioID == id {
			delete(m.portfolioTestimonials, tid)
		}
	}
	return nil
}

func (m *Memory) CreatePortfolio(title string) *model.Portfolio {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := formatTime(time.Now().UTC())
	id := uuid.NewString()
	portfolio := &model.Portfolio{
		ID:          id,
		WorkspaceID: m.workspace.ID,
		Title:       title,
		CreatedBy:   m.user.ID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.portfolios[id] = clonePortfolio(portfolio)
	m.portfolioSettings[id] = defaultPortfolioSettings(id)
	return clonePortfolio(portfolio)
}

func (m *Memory) touchPortfolioLocked(portfolioID string) {
	if pf := m.portfolios[portfolioID]; pf != nil {
		pf.UpdatedAt = formatTime(time.Now().UTC())
		m.portfolios[portfolioID] = clonePortfolio(pf)
	}
}

func filterPortfolioProjects(projects map[string]*model.PortfolioProject, portfolioID string) []*model.PortfolioProject {
	out := make([]*model.PortfolioProject, 0)
	for _, p := range projects {
		if p.PortfolioID == portfolioID {
			out = append(out, p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SortOrder < out[j].SortOrder })
	return out
}

func filterPortfolioSkills(skills map[string]*model.PortfolioSkill, portfolioID string) []*model.PortfolioSkill {
	out := make([]*model.PortfolioSkill, 0)
	for _, s := range skills {
		if s.PortfolioID == portfolioID {
			out = append(out, s)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SortOrder < out[j].SortOrder })
	return out
}

func filterPortfolioTestimonials(testimonials map[string]*model.PortfolioTestimonial, portfolioID string) []*model.PortfolioTestimonial {
	out := make([]*model.PortfolioTestimonial, 0)
	for _, t := range testimonials {
		if t.PortfolioID == portfolioID {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SortOrder < out[j].SortOrder })
	return out
}

func clonePortfolioProjects(items []*model.PortfolioProject) []*model.PortfolioProject {
	out := make([]*model.PortfolioProject, 0, len(items))
	for _, item := range items {
		out = append(out, clonePortfolioProject(item))
	}
	return out
}

func clonePortfolioSkills(items []*model.PortfolioSkill) []*model.PortfolioSkill {
	out := make([]*model.PortfolioSkill, 0, len(items))
	for _, item := range items {
		out = append(out, clonePortfolioSkill(item))
	}
	return out
}

func clonePortfolioTestimonials(items []*model.PortfolioTestimonial) []*model.PortfolioTestimonial {
	out := make([]*model.PortfolioTestimonial, 0, len(items))
	for _, item := range items {
		out = append(out, clonePortfolioTestimonial(item))
	}
	return out
}

func maxPortfolioProjectSort(projects map[string]*model.PortfolioProject, portfolioID string) int {
	max := -1
	for _, p := range projects {
		if p.PortfolioID == portfolioID && p.SortOrder > max {
			max = p.SortOrder
		}
	}
	return max
}

func maxPortfolioSkillSort(skills map[string]*model.PortfolioSkill, portfolioID string) int {
	max := -1
	for _, s := range skills {
		if s.PortfolioID == portfolioID && s.SortOrder > max {
			max = s.SortOrder
		}
	}
	return max
}

func maxPortfolioTestimonialSort(testimonials map[string]*model.PortfolioTestimonial, portfolioID string) int {
	max := -1
	for _, t := range testimonials {
		if t.PortfolioID == portfolioID && t.SortOrder > max {
			max = t.SortOrder
		}
	}
	return max
}
