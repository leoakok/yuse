package store

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func (p *Postgres) ListAdminUsers() ([]*model.AdminUser, error) {
	return ListAdminUsers(context.Background(), p.pool)
}

func (p *Postgres) ListWaitlistEntries(status *model.WaitlistStatus) ([]*model.WaitlistEntry, error) {
	return ListWaitlistEntries(context.Background(), p.pool, status)
}

func (p *Postgres) ListAdminAuditLog(limit, offset int) ([]*model.AdminAuditLogEntry, error) {
	return ListAdminAuditLog(context.Background(), p.pool, limit, offset)
}

func (p *Postgres) ApproveWaitlistEntry(actorID, id string) (*model.WaitlistEntry, error) {
	return ApproveWaitlistEntry(context.Background(), p.pool, actorID, id)
}

func (p *Postgres) RejectWaitlistEntry(actorID, id string) (*model.WaitlistEntry, error) {
	return RejectWaitlistEntry(context.Background(), p.pool, actorID, id)
}

func (p *Postgres) SetUserActive(actorID, userID string, active bool) (*model.AdminUser, error) {
	return SetUserActive(context.Background(), p.pool, actorID, userID, active)
}

func (p *Postgres) SetUserRole(actorID, userID string, role model.UserRole) (*model.AdminUser, error) {
	return SetUserRole(context.Background(), p.pool, actorID, userID, role)
}
