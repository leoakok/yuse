package cv

import (
	"fmt"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// ListAdminUsers returns all users (admin only).
func (s *Service) ListAdminUsers() ([]*model.AdminUser, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListAdminUsers()
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
