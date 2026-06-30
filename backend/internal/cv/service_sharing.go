package cv

import (
	"errors"
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func (s *Service) SetUsername(username string) (*model.User, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	updated, err := s.store.SetUsername(user.ID, username)
	if err != nil {
		if errors.Is(err, store.ErrUsernameTaken) {
			return nil, fmt.Errorf("that username is already taken")
		}
		return nil, err
	}
	return updated, nil
}

func (s *Service) SetPortfolioSlug(portfolioID, slug string) (*model.Portfolio, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	updated, err := s.store.SetPortfolioSlug(user.ID, portfolioID, slug)
	if err != nil {
		if errors.Is(err, store.ErrSlugTaken) {
			return nil, fmt.Errorf("that portfolio URL is already used on your account")
		}
		return nil, err
	}
	return updated, nil
}

func (s *Service) PublicPortfolioWithContent(username string, slug *string) (*model.PortfolioWithContent, error) {
	content, err := s.store.PublicPortfolioWithContent(username, slug)
	if errors.Is(err, store.ErrNotFound) {
		return nil, nil
	}
	return content, err
}
