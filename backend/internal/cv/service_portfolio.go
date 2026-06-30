package cv

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func (s *Service) ListPortfolios() []*model.Portfolio {
	return s.store.ListPortfolios()
}

func (s *Service) GetPortfolio(id string) (*model.Portfolio, error) {
	return s.store.GetPortfolio(id)
}

func (s *Service) GetPortfolioWithContent(id string) (*model.PortfolioWithContent, error) {
	return s.store.PortfolioWithContent(id)
}

func (s *Service) CreatePortfolio(title string) *model.Portfolio {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		trimmed = "Untitled Portfolio"
	}
	return s.store.CreatePortfolio(trimmed)
}

func (s *Service) DuplicatePortfolio(id string) (*model.Portfolio, error) {
	return s.store.DuplicatePortfolio(id)
}

func (s *Service) DeletePortfolio(id string) (bool, error) {
	if err := s.store.DeletePortfolio(id); err != nil {
		return false, err
	}
	return true, nil
}

func (s *Service) UpdatePortfolio(
	id string,
	title, tagline, about *string,
	contactProfileID *string,
) (*model.Portfolio, error) {
	portfolio, err := s.store.GetPortfolio(id)
	if err != nil {
		return nil, err
	}
	if title != nil {
		portfolio.Title = strings.TrimSpace(*title)
	}
	if tagline != nil {
		portfolio.Tagline = strings.TrimSpace(*tagline)
	}
	if about != nil {
		portfolio.About = strings.TrimSpace(*about)
	}
	if contactProfileID != nil {
		portfolio.ContactProfileID = contactProfileID
	}
	portfolio.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.store.SavePortfolio(portfolio)
	return portfolio, nil
}

func (s *Service) UpdatePortfolioSettings(input model.UpdatePortfolioSettingsInput) (*model.PortfolioSettings, error) {
	return s.store.UpdatePortfolioSettings(input.PortfolioID, func(settings *model.PortfolioSettings) {
		if input.Layout != nil {
			settings.Layout = *input.Layout
		}
		if input.AccentColor != nil {
			settings.AccentColor = strings.TrimSpace(*input.AccentColor)
		}
		if input.ThemeID != nil {
			settings.ThemeID = *input.ThemeID
		}
		if input.ShowPhoto != nil {
			settings.ShowPhoto = *input.ShowPhoto
		}
		if input.Locale != nil {
			settings.Locale = *input.Locale
		}
	})
}

func (s *Service) AddPortfolioProject(input model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error) {
	return s.store.AddPortfolioProject(input)
}

func (s *Service) UpdatePortfolioProject(input model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error) {
	return s.store.UpdatePortfolioProject(input)
}

func (s *Service) DeletePortfolioProject(portfolioID, projectID string) (*model.PortfolioWithContent, error) {
	return s.store.DeletePortfolioProject(portfolioID, projectID)
}

func (s *Service) SetPortfolioProjectVisibility(input model.SetPortfolioProjectVisibilityInput) (*model.PortfolioWithContent, error) {
	return s.store.SetPortfolioProjectVisibility(input.PortfolioID, input.ProjectID, input.ShowInPreview)
}

func (s *Service) AddPortfolioSkill(input model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error) {
	return s.store.AddPortfolioSkill(input)
}

func (s *Service) UpdatePortfolioSkill(input model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error) {
	return s.store.UpdatePortfolioSkill(input)
}

func (s *Service) DeletePortfolioSkill(portfolioID, skillID string) (*model.PortfolioWithContent, error) {
	return s.store.DeletePortfolioSkill(portfolioID, skillID)
}

func (s *Service) AddPortfolioTestimonial(input model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	return s.store.AddPortfolioTestimonial(input)
}

func (s *Service) UpdatePortfolioTestimonial(input model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	return s.store.UpdatePortfolioTestimonial(input)
}

func (s *Service) DeletePortfolioTestimonial(portfolioID, testimonialID string) (*model.PortfolioWithContent, error) {
	return s.store.DeletePortfolioTestimonial(portfolioID, testimonialID)
}

func (s *Service) UpdatePortfolioContactProfile(
	ctx context.Context,
	input model.UpdatePortfolioContactProfileInput,
) (*model.PortfolioWithContent, error) {
	if input.PhotoURL != nil && s.photos != nil {
		trimmed := strings.TrimSpace(*input.PhotoURL)
		if trimmed != "" {
			workspace := s.store.Workspace()
			user := s.store.User()
			if workspace == nil || user == nil {
				return nil, fmt.Errorf("session required")
			}
			if err := s.photos.ValidatePhotoURL(ctx, workspace.ID, user.ID, trimmed); err != nil {
				return nil, err
			}
		}
	}
	return s.store.UpdatePortfolioContactProfile(
		input.PortfolioID,
		input.FullName,
		input.Headline,
		input.Email,
		input.Phone,
		input.Location,
		input.Website,
		input.LinkedIn,
		input.Github,
		input.PhotoURL,
		input.LinkedinPhotoURL,
		input.GithubPhotoURL,
	)
}
