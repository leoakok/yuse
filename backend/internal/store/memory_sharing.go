package store

import (
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/slug"
)

func (m *Memory) SetUsername(userID, raw string) (*model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.user == nil || m.user.ID != userID {
		return nil, ErrNotFound
	}
	normalized, err := slug.Validate(raw)
	if err != nil {
		return nil, err
	}
	m.user.Username = &normalized
	return cloneUser(m.user), nil
}

func (m *Memory) SetPortfolioSlug(userID, portfolioID, raw string) (*model.Portfolio, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	portfolio, ok := m.portfolios[portfolioID]
	if !ok || portfolio.CreatedBy != userID {
		return nil, ErrNotFound
	}
	normalized, err := slug.Validate(raw)
	if err != nil {
		return nil, err
	}
	for id, pf := range m.portfolios {
		if id != portfolioID && pf.CreatedBy == userID && pf.Slug != nil && strings.EqualFold(*pf.Slug, normalized) {
			return nil, ErrSlugTaken
		}
	}
	portfolio.Slug = &normalized
	m.portfolios[portfolioID] = clonePortfolio(portfolio)
	return clonePortfolio(portfolio), nil
}

func (m *Memory) PublicPortfolioWithContent(username string, slugOpt *string) (*model.PortfolioWithContent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	normalizedUser, err := slug.Validate(username)
	if err != nil {
		return nil, ErrNotFound
	}
	if m.user == nil || m.user.Username == nil || !strings.EqualFold(*m.user.Username, normalizedUser) {
		return nil, ErrNotFound
	}

	var targetID string
	if slugOpt != nil && strings.TrimSpace(*slugOpt) != "" {
		normalizedSlug, err := slug.Validate(*slugOpt)
		if err != nil {
			return nil, ErrNotFound
		}
		for id, pf := range m.portfolios {
			if pf.Slug != nil && strings.EqualFold(*pf.Slug, normalizedSlug) {
				targetID = id
				break
			}
		}
	} else {
		var oldest *model.Portfolio
		for _, pf := range m.portfolios {
			if oldest == nil || pf.CreatedAt < oldest.CreatedAt {
				oldest = pf
			}
		}
		if oldest != nil {
			targetID = oldest.ID
		}
	}
	if targetID == "" {
		return nil, ErrNotFound
	}
	return m.portfolioWithContentLocked(targetID)
}
