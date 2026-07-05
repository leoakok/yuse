package cv

import (
	"errors"
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func (s *Service) ChangePassword(currentPassword, newPassword string) error {
	user := s.store.User()
	if user == nil {
		return fmt.Errorf("not signed in")
	}
	err := s.store.ChangePassword(user.ID, currentPassword, newPassword)
	if errors.Is(err, store.ErrPasswordManagedExternally) {
		return fmt.Errorf("password is managed by your sign-in provider")
	}
	if errors.Is(err, store.ErrIncorrectPassword) {
		return fmt.Errorf("current password is incorrect")
	}
	return err
}

func (s *Service) ChangeEmail(currentPassword, newEmail string, verificationRequired bool) (*model.User, error) {
	user := s.store.User()
	if user == nil {
		return nil, fmt.Errorf("not signed in")
	}
	updated, err := s.store.ChangeEmail(user.ID, currentPassword, newEmail, verificationRequired)
	if errors.Is(err, store.ErrEmailManagedExternally) {
		return nil, fmt.Errorf("email is managed by your sign-in provider")
	}
	if errors.Is(err, store.ErrIncorrectPassword) {
		return nil, fmt.Errorf("current password is incorrect")
	}
	return updated, err
}
