package cv

import (
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/email"
)

// SendTestEmail sends a preview transactional email (admin only).
func (s *Service) SendTestEmail(
	emailType model.TestEmailType,
	recipientEmail string,
	emailCfg email.Config,
	appOrigin string,
) (*model.SendTestEmailResult, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	if s.store.User() == nil {
		return nil, ErrForbidden
	}
	if !emailType.IsValid() {
		return nil, fmt.Errorf("invalid email type")
	}
	if err := auth.ValidateEmail(recipientEmail); err != nil {
		return nil, err
	}

	to := auth.NormalizeEmail(recipientEmail)
	if err := email.SendTestEmail(emailCfg, emailType.String(), to, appOrigin); err != nil {
		msg := err.Error()
		return &model.SendTestEmailResult{
			Success: false,
			Message: &msg,
		}, nil
	}

	msg := "Email sent"
	return &model.SendTestEmailResult{
		Success: true,
		Message: &msg,
	}, nil
}
