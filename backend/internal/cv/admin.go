package cv

import (
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// ListAdminUsers returns paginated users (admin only).
func (s *Service) ListAdminUsers(limit, offset int, query *string) ([]*model.AdminUser, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	q := ""
	if query != nil {
		q = *query
	}
	return s.store.ListAdminUsers(limit, offset, q)
}

// ListWaitlistEntries returns waitlist rows (admin only).
func (s *Service) ListWaitlistEntries(status *model.WaitlistStatus) ([]*model.WaitlistEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListWaitlistEntries(status)
}

// ListAdminAuditLog returns audit log entries (admin only).
func (s *Service) ListAdminAuditLog(limit, offset int) ([]*model.AdminAuditLogEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListAdminAuditLog(limit, offset)
}

// ApproveWaitlistEntry approves a waitlist email (admin only).
func (s *Service) ApproveWaitlistEntry(id string) (*model.WaitlistEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	return s.store.ApproveWaitlistEntry(actor.ID, id)
}

// RejectWaitlistEntry rejects a waitlist email (admin only).
func (s *Service) RejectWaitlistEntry(id string) (*model.WaitlistEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	return s.store.RejectWaitlistEntry(actor.ID, id)
}

// SetUserActive activates or deactivates a user (admin only).
func (s *Service) SetUserActive(userID string, active bool) (*model.AdminUser, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	return s.store.SetUserActive(actor.ID, userID, active)
}

// SetUserRole updates a user's platform role (admin only).
func (s *Service) SetUserRole(userID string, role model.UserRole) (*model.AdminUser, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	if !role.IsValid() {
		return nil, fmt.Errorf("invalid role")
	}
	return s.store.SetUserRole(actor.ID, userID, role)
}

// SetUserAiLimits updates AI enabled and monthly token override (admin only).
func (s *Service) SetUserAiLimits(userID string, aiEnabled bool, aiMonthlyTokenLimit *int) (*model.AdminUser, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	actor := s.store.User()
	if actor == nil {
		return nil, ErrForbidden
	}
	var override *int64
	if aiMonthlyTokenLimit != nil {
		v := int64(*aiMonthlyTokenLimit)
		override = &v
	}
	return s.store.SetUserAiLimits(actor.ID, userID, aiEnabled, override)
}

// ListInviteLinks returns beta invite links (admin only).
func (s *Service) ListInviteLinks() ([]*model.InviteLink, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListInviteLinks()
}

// CreateInviteLink creates a beta invite link (admin only).
func (s *Service) CreateInviteLink(input model.CreateInviteLinkInput) (*model.InviteLink, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.CreateInviteLink(input)
}

// UpdateInviteLink updates a beta invite link (admin only).
func (s *Service) UpdateInviteLink(input model.UpdateInviteLinkInput) (*model.InviteLink, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.UpdateInviteLink(input)
}
