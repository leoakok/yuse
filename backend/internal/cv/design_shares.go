package cv

import (
	"errors"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func (s *Service) CreateDesignShare(resumeID string, contentMode model.DesignShareContentMode, title *string) (*model.DesignShare, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	if !contentMode.IsValid() {
		return nil, fmt.Errorf("invalid content mode")
	}

	content, err := s.store.ResumeWithContent(resumeID)
	if err != nil {
		return nil, err
	}
	if content.Resume.CreatedBy != user.ID {
		return nil, store.ErrNotFound
	}

	return s.store.UpsertDesignShare(user.ID, resumeID, contentMode, title, content.Settings, content.Theme)
}

func (s *Service) DeactivateDesignShare(shareID string) (*model.DesignShare, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	shareID = strings.TrimSpace(shareID)
	if shareID == "" {
		return nil, fmt.Errorf("design share id is required")
	}
	return s.store.DeactivateDesignShare(user.ID, shareID)
}

func (s *Service) GetDesignShareForResume(resumeID string) (*model.DesignShare, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	resume, err := s.store.GetResume(resumeID)
	if err != nil {
		return nil, err
	}
	if resume.CreatedBy != user.ID {
		return nil, store.ErrNotFound
	}
	return s.store.GetDesignShareForResume(resumeID)
}

func (s *Service) ApplyDesignShare(designShareID string, resumeID *string) (*model.Resume, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}

	share, preview, err := s.store.PublicDesignPreview(designShareID)
	if err != nil {
		return nil, err
	}
	if share == nil || preview == nil {
		return nil, store.ErrDesignShareNotFound
	}

	targetID := ""
	if resumeID != nil && strings.TrimSpace(*resumeID) != "" {
		targetID = strings.TrimSpace(*resumeID)
		resume, getErr := s.store.GetResume(targetID)
		if getErr != nil {
			return nil, getErr
		}
		if resume.CreatedBy != user.ID {
			return nil, store.ErrNotFound
		}
	} else {
		title := "New resume"
		if share.Title != nil && strings.TrimSpace(*share.Title) != "" {
			title = strings.TrimSpace(*share.Title)
		}
		created := s.store.CreateResume(title)
		targetID = created.ID
	}

	_, err = s.store.ApplyDesignShareSettings(targetID, user.ID, preview.Settings)
	if err != nil {
		return nil, err
	}
	return s.store.GetResume(targetID)
}

func (s *Service) PublicDesignPreview(designShareID string) (*model.DesignShare, *model.ResumeWithContent, error) {
	share, preview, err := s.store.PublicDesignPreview(designShareID)
	if errors.Is(err, store.ErrDesignShareNotFound) {
		return nil, nil, nil
	}
	return share, preview, err
}

func (s *Service) ListFeaturedDesigns() ([]*model.CuratedTheme, error) {
	featured := true
	return s.store.ListCuratedThemes(&featured, nil)
}

func (s *Service) ListPublicThemes() ([]*model.CuratedTheme, error) {
	isPublic := true
	return s.store.ListCuratedThemes(nil, &isPublic)
}

func (s *Service) ListAdminCuratedThemes() ([]*model.CuratedTheme, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListCuratedThemes(nil, nil)
}

func (s *Service) CreateCuratedTheme(input model.CreateCuratedThemeInput) (*model.CuratedTheme, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	created, err := s.store.CreateCuratedTheme(actor.ID, input)
	if err != nil {
		if errors.Is(err, store.ErrInvalidDesignURL) {
			return nil, fmt.Errorf("paste a design link (/d/...), not a full resume link")
		}
		return nil, err
	}
	return created, nil
}

func (s *Service) UpdateCuratedTheme(input model.UpdateCuratedThemeInput) (*model.CuratedTheme, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	return s.store.UpdateCuratedTheme(actor.ID, input)
}

func (s *Service) DeleteCuratedTheme(id string) (bool, error) {
	if err := s.requireAdmin(); err != nil {
		return false, err
	}
	actor := s.store.User()
	if actor == nil {
		return false, ErrForbidden
	}
	return s.store.DeleteCuratedTheme(actor.ID, id)
}
