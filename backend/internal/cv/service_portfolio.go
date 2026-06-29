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

func (s *Service) PortfoliosForSection(sectionID string) ([]*model.Portfolio, error) {
	return s.store.PortfoliosForSection(sectionID)
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
	title *string,
	contactProfileID *string,
) (*model.Portfolio, error) {
	portfolio, err := s.store.GetPortfolio(id)
	if err != nil {
		return nil, err
	}
	if title != nil {
		portfolio.Title = strings.TrimSpace(*title)
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
		if input.PageFormat != nil {
			settings.PageFormat = *input.PageFormat
		}
		if input.FontSize != nil {
			settings.FontSize = *input.FontSize
		}
		if input.MarginHorizontalMm != nil {
			settings.MarginHorizontalMm = *input.MarginHorizontalMm
		}
		if input.MarginVerticalMm != nil {
			settings.MarginVerticalMm = *input.MarginVerticalMm
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

func (s *Service) UpdatePortfolioSectionItemVisibility(
	input model.UpdatePortfolioSectionItemVisibilityInput,
) (*model.PortfolioWithContent, error) {
	return s.store.UpdatePortfolioSectionItemVisibility(
		input.PortfolioID,
		input.SectionID,
		input.SectionItemID,
		input.ShowInPreview,
	)
}

func (s *Service) UpdatePortfolioSectionItem(
	input model.UpdatePortfolioSectionItemInput,
) (*model.PortfolioWithContent, error) {
	return s.store.UpdatePortfolioSectionItem(
		input.PortfolioID,
		input.SectionID,
		input.SectionItemID,
		input.Headline,
		input.Body,
		input.Metadata,
	)
}

func (s *Service) AddPortfolioSectionItem(
	input model.AddPortfolioSectionItemInput,
) (*model.PortfolioWithContent, error) {
	headline := ""
	if input.Headline != nil {
		headline = *input.Headline
	}
	body := ""
	if input.Body != nil {
		body = *input.Body
	}
	return s.store.AddPortfolioSectionItem(
		input.PortfolioID,
		input.SectionID,
		headline,
		body,
		input.Metadata,
	)
}

func (s *Service) DeletePortfolioSectionItem(portfolioID, sectionItemID string) (*model.PortfolioWithContent, error) {
	if err := s.store.DeleteSectionItem(sectionItemID); err != nil {
		return nil, err
	}
	return s.store.PortfolioWithContent(portfolioID)
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
	)
}
