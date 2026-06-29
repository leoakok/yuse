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

func (m *Memory) UpdatePortfolioSectionItemVisibility(
	portfolioID, sectionID, sectionItemID string,
	showInPreview bool,
) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[portfolioID]; !ok {
		return nil, ErrNotFound
	}
	found := false
	for i, link := range m.portfolioVisibilityLinks {
		if link.portfolioID == portfolioID && link.sectionID == sectionID && link.sectionItemID == sectionItemID {
			m.portfolioVisibilityLinks[i].showInPreview = showInPreview
			found = true
			break
		}
	}
	if !found {
		m.portfolioVisibilityLinks = append(m.portfolioVisibilityLinks, portfolioItemVisibilityLink{
			portfolioID: portfolioID, sectionID: sectionID, sectionItemID: sectionItemID, showInPreview: showInPreview,
		})
	}
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) AddPortfolioSectionItem(
	portfolioID, sectionID, headline, body string,
	metadata map[string]any,
) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.portfolios[portfolioID]; !ok {
		return nil, ErrNotFound
	}
	section, ok := m.sections[sectionID]
	if !ok {
		return nil, ErrNotFound
	}
	trimmedHeadline := strings.TrimSpace(headline)
	if trimmedHeadline == "" {
		trimmedHeadline = defaultSectionItemHeadline(section.Type)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	itemID := uuid.NewString()
	item := &model.SectionItem{
		ID: itemID, WorkspaceID: DemoWorkspaceID, Type: section.Type,
		Headline: trimmedHeadline, Body: strings.TrimSpace(body), Metadata: metadata,
		CreatedBy: DemoUserID, CreatedAt: now, UpdatedAt: now,
	}
	m.sectionItems[itemID] = cloneSectionItem(item)
	maxOrder := -1
	for _, link := range m.sectionItemLinks {
		if link.sectionID == sectionID && link.sortOrder > maxOrder {
			maxOrder = link.sortOrder
		}
	}
	m.sectionItemLinks = append(m.sectionItemLinks, sectionItemLink{sectionID: sectionID, sectionItemID: itemID, sortOrder: maxOrder + 1})
	m.portfolioVisibilityLinks = appendPortfolioItemVisibility(m.portfolioVisibilityLinks, m.portfolioSections, portfolioID, sectionID, itemID)
	return m.portfolioWithContentLocked(portfolioID)
}

func appendPortfolioItemVisibility(
	links []portfolioItemVisibilityLink,
	portfolioSections []portfolioSectionLink,
	originPortfolioID, sectionID, itemID string,
) []portfolioItemVisibilityLink {
	links = append(links, portfolioItemVisibilityLink{
		portfolioID: originPortfolioID, sectionID: sectionID, sectionItemID: itemID, showInPreview: true,
	})
	seen := map[string]struct{}{originPortfolioID: {}}
	for _, ps := range portfolioSections {
		if ps.sectionID != sectionID {
			continue
		}
		if _, ok := seen[ps.portfolioID]; ok {
			continue
		}
		seen[ps.portfolioID] = struct{}{}
		if ps.portfolioID == originPortfolioID {
			continue
		}
		links = append(links, portfolioItemVisibilityLink{
			portfolioID: ps.portfolioID, sectionID: sectionID, sectionItemID: itemID, showInPreview: false,
		})
	}
	return links
}

func (m *Memory) UpdatePortfolioSectionItem(
	portfolioID, sectionID, sectionItemID string,
	headline, body *string,
	metadata map[string]any,
) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.sectionItems[sectionItemID]
	if !ok {
		return nil, ErrNotFound
	}
	if _, ok := m.portfolios[portfolioID]; !ok {
		return nil, ErrNotFound
	}
	if headline != nil {
		item.Headline = strings.TrimSpace(*headline)
	}
	if body != nil {
		item.Body = strings.TrimSpace(*body)
	}
	if metadata != nil {
		if item.Metadata == nil {
			item.Metadata = map[string]any{}
		}
		for k, v := range metadata {
			if v != nil {
				item.Metadata[k] = v
			}
		}
	}
	item.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	m.sectionItems[sectionItemID] = cloneSectionItem(item)
	return m.portfolioWithContentLocked(portfolioID)
}

func (m *Memory) UpdatePortfolioContactProfile(
	portfolioID string,
	fullName, headline, email, phone, location, website, linkedIn, github, photoURL *string,
) (*model.PortfolioWithContent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	portfolio, ok := m.portfolios[portfolioID]
	if !ok {
		return nil, ErrNotFound
	}
	now := time.Now().UTC().Format(time.RFC3339)
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
		profile = &model.ContactProfile{ID: id, WorkspaceID: DemoWorkspaceID, FullName: name, CreatedAt: now, UpdatedAt: now}
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
	profile.UpdatedAt = now
	m.contactProfiles[profile.ID] = cloneContactProfile(profile)
	portfolio.UpdatedAt = now
	m.portfolios[portfolioID] = clonePortfolio(portfolio)
	return m.portfolioWithContentLocked(portfolioID)
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
	var theme *model.CvTheme
	for _, t := range m.themes {
		if t.ID == settings.ThemeID {
			theme = cloneTheme(t)
			break
		}
	}
	var contact *model.ContactProfile
	if portfolio.ContactProfileID != nil {
		contact = cloneContactProfile(m.contactProfiles[*portfolio.ContactProfileID])
	}
	sectionLinks := filterPortfolioSections(m.portfolioSections, portfolioID)
	sectionsWithItems := make([]*model.SectionWithItems, 0, len(sectionLinks))
	for _, link := range sectionLinks {
		section := m.sections[link.sectionID]
		if section == nil {
			continue
		}
		items := portfolioSectionItems(m, portfolioID, link.sectionID)
		sectionsWithItems = append(sectionsWithItems, &model.SectionWithItems{
			Section: cloneSection(section),
			Items:   items,
		})
	}
	return &model.PortfolioWithContent{
		Portfolio:      clonePortfolio(portfolio),
		ContactProfile: contact,
		Settings:       clonePortfolioSettings(settings),
		Theme:          theme,
		Sections:       sectionsWithItems,
	}, nil
}

func filterPortfolioSections(links []portfolioSectionLink, portfolioID string) []portfolioSectionLink {
	out := make([]portfolioSectionLink, 0)
	for _, l := range links {
		if l.portfolioID == portfolioID {
			out = append(out, l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].sortOrder < out[j].sortOrder })
	return out
}

func portfolioSectionItems(m *Memory, portfolioID, sectionID string) []*model.SectionItem {
	itemLinks := filterSectionItems(m.sectionItemLinks, sectionID)
	out := make([]*model.SectionItem, 0, len(itemLinks))
	for _, link := range itemLinks {
		item := m.sectionItems[link.sectionItemID]
		if item == nil {
			continue
		}
		cloned := cloneSectionItem(item)
		cloned.ShowInPreview = portfolioItemShowInPreview(m.portfolioVisibilityLinks, portfolioID, sectionID, link.sectionItemID)
		out = append(out, withDefaultShowInPreview(cloned))
	}
	return out
}

func portfolioItemShowInPreview(links []portfolioItemVisibilityLink, portfolioID, sectionID, itemID string) bool {
	for _, link := range links {
		if link.portfolioID == portfolioID && link.sectionID == sectionID && link.sectionItemID == itemID {
			return link.showInPreview
		}
	}
	return false
}

func (m *Memory) PortfoliosForSection(sectionID string) ([]*model.Portfolio, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if _, ok := m.sections[sectionID]; !ok {
		return nil, ErrNotFound
	}
	ids := map[string]struct{}{}
	for _, link := range m.portfolioSections {
		if link.sectionID == sectionID {
			ids[link.portfolioID] = struct{}{}
		}
	}
	out := make([]*model.Portfolio, 0, len(ids))
	for pid := range ids {
		if pf := m.portfolios[pid]; pf != nil {
			out = append(out, clonePortfolio(pf))
		}
	}
	return out, nil
}

func (m *Memory) DuplicatePortfolio(sourceID string) (*model.Portfolio, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	source, ok := m.portfolios[sourceID]
	if !ok {
		return nil, ErrNotFound
	}
	now := time.Now().UTC().Format(time.RFC3339)
	newID := uuid.NewString()
	dup := &model.Portfolio{
		ID: newID, WorkspaceID: source.WorkspaceID, Title: source.Title + " (copy)",
		CreatedBy: source.CreatedBy, CreatedAt: now, UpdatedAt: now,
	}
	if source.ContactProfileID != nil {
		id := *source.ContactProfileID
		dup.ContactProfileID = &id
	}
	m.portfolios[newID] = clonePortfolio(dup)
	if settings := m.portfolioSettings[sourceID]; settings != nil {
		s := clonePortfolioSettings(settings)
		s.PortfolioID = newID
		m.portfolioSettings[newID] = s
	} else {
		m.portfolioSettings[newID] = defaultPortfolioSettings(newID)
	}
	maxSort := 0
	for _, link := range m.portfolioSections {
		if link.portfolioID == sourceID {
			m.portfolioSections = append(m.portfolioSections, portfolioSectionLink{
				portfolioID: newID, sectionID: link.sectionID, sortOrder: link.sortOrder,
			})
		}
		if link.portfolioID == newID && link.sortOrder >= maxSort {
			maxSort = link.sortOrder + 1
		}
	}
	for _, link := range m.portfolioVisibilityLinks {
		if link.portfolioID == sourceID {
			m.portfolioVisibilityLinks = append(m.portfolioVisibilityLinks, portfolioItemVisibilityLink{
				portfolioID: newID, sectionID: link.sectionID, sectionItemID: link.sectionItemID, showInPreview: link.showInPreview,
			})
		}
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
	sections := make([]portfolioSectionLink, 0)
	for _, link := range m.portfolioSections {
		if link.portfolioID != id {
			sections = append(sections, link)
		}
	}
	m.portfolioSections = sections
	visibility := make([]portfolioItemVisibilityLink, 0)
	for _, link := range m.portfolioVisibilityLinks {
		if link.portfolioID != id {
			visibility = append(visibility, link)
		}
	}
	m.portfolioVisibilityLinks = visibility
	return nil
}

func (m *Memory) CreatePortfolio(title string) *model.Portfolio {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.NewString()
	portfolio := &model.Portfolio{
		ID: id, WorkspaceID: DemoWorkspaceID, Title: title,
		CreatedBy: DemoUserID, CreatedAt: now, UpdatedAt: now,
	}
	m.portfolios[id] = clonePortfolio(portfolio)
	m.portfolioSettings[id] = defaultPortfolioSettings(id)
	specs := portfolioDefaultSectionSpecs()
	for i, spec := range specs {
		for _, section := range m.sections {
			if section.Type != spec.sectionType {
				continue
			}
			m.portfolioSections = append(m.portfolioSections, portfolioSectionLink{
				portfolioID: id, sectionID: section.ID, sortOrder: i,
			})
			for _, itemLink := range m.sectionItemLinks {
				if itemLink.sectionID != section.ID {
					continue
				}
				m.portfolioVisibilityLinks = append(m.portfolioVisibilityLinks, portfolioItemVisibilityLink{
					portfolioID: id, sectionID: section.ID, sectionItemID: itemLink.sectionItemID, showInPreview: false,
				})
			}
			break
		}
	}
	return clonePortfolio(portfolio)
}
