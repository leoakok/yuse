package store

import (
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func (m *Memory) ChangePassword(userID, currentPassword, newPassword string) error {
	return fmt.Errorf("password changes require postgres")
}

func (m *Memory) ChangeEmail(userID, currentPassword, newEmail string, verificationRequired bool) (*model.User, error) {
	return nil, fmt.Errorf("email changes require postgres")
}
