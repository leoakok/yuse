package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

// ListAdminUsers returns all platform users for the admin panel.
func ListAdminUsers(ctx context.Context, pool *pgxpool.Pool) ([]*model.AdminUser, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, email, display_name, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	out := make([]*model.AdminUser, 0)
	for rows.Next() {
		user, err := scanAdminUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, user)
	}
	return out, rows.Err()
}

// ListWaitlistEntries returns waitlist rows, optionally filtered by status.
func ListWaitlistEntries(ctx context.Context, pool *pgxpool.Pool, status *model.WaitlistStatus) ([]*model.WaitlistEntry, error) {
	query := `
		SELECT id, email, status, submitted_at, reviewed_at, reviewed_by
		FROM beta_waitlist
	`
	args := []any{}
	if status != nil {
		query += ` WHERE status = $1`
		args = append(args, strings.ToLower(string(*status)))
	}
	query += ` ORDER BY submitted_at DESC`

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list waitlist: %w", err)
	}
	defer rows.Close()

	out := make([]*model.WaitlistEntry, 0)
	for rows.Next() {
		entry, err := scanWaitlistEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}

// ApproveWaitlistEntry marks a waitlist email as approved.
func ApproveWaitlistEntry(ctx context.Context, pool *pgxpool.Pool, actorID, entryID string) (*model.WaitlistEntry, error) {
	return reviewWaitlistEntry(ctx, pool, actorID, entryID, "approved", "approve_waitlist")
}

// RejectWaitlistEntry marks a waitlist email as rejected.
func RejectWaitlistEntry(ctx context.Context, pool *pgxpool.Pool, actorID, entryID string) (*model.WaitlistEntry, error) {
	return reviewWaitlistEntry(ctx, pool, actorID, entryID, "rejected", "reject_waitlist")
}

func reviewWaitlistEntry(ctx context.Context, pool *pgxpool.Pool, actorID, entryID, status, auditAction string) (*model.WaitlistEntry, error) {
	now := time.Now().UTC()
	row := pool.QueryRow(ctx, `
		UPDATE beta_waitlist
		SET status = $2, reviewed_at = $3, reviewed_by = $4
		WHERE id = $1
		RETURNING id, email, status, submitted_at, reviewed_at, reviewed_by
	`, entryID, status, now, actorID)

	entry, err := scanWaitlistEntry(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("waitlist entry not found")
	}
	if err != nil {
		return nil, fmt.Errorf("review waitlist: %w", err)
	}

	if err := RecordAdminAudit(ctx, pool, actorID, auditAction, "waitlist", entryID, map[string]any{
		"email":  entry.Email,
		"status": status,
	}); err != nil {
		return nil, err
	}
	return entry, nil
}

// SetUserActive activates or deactivates a user account.
func SetUserActive(ctx context.Context, pool *pgxpool.Pool, actorID, userID string, active bool) (*model.AdminUser, error) {
	if actorID == userID && !active {
		return nil, fmt.Errorf("cannot deactivate your own account")
	}

	row := pool.QueryRow(ctx, `
		UPDATE users
		SET is_active = $2, updated_at = $3
		WHERE id = $1
		RETURNING id, email, display_name, role, is_active, created_at, updated_at
	`, userID, active, time.Now().UTC())

	user, err := scanAdminUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("set user active: %w", err)
	}

	action := "deactivate_user"
	if active {
		action = "activate_user"
	}
	if err := RecordAdminAudit(ctx, pool, actorID, action, "user", userID, map[string]any{
		"email":    user.Email,
		"isActive": active,
	}); err != nil {
		return nil, err
	}
	return user, nil
}

// SetUserRole updates a user's platform role.
func SetUserRole(ctx context.Context, pool *pgxpool.Pool, actorID, userID string, role model.UserRole) (*model.AdminUser, error) {
	if !role.IsValid() {
		return nil, fmt.Errorf("invalid role")
	}
	if actorID == userID && role != model.UserRoleAdmin {
		return nil, fmt.Errorf("cannot demote your own admin role")
	}

	row := pool.QueryRow(ctx, `
		UPDATE users
		SET role = $2, updated_at = $3
		WHERE id = $1
		RETURNING id, email, display_name, role, is_active, created_at, updated_at
	`, userID, string(role), time.Now().UTC())

	user, err := scanAdminUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("set user role: %w", err)
	}

	if err := RecordAdminAudit(ctx, pool, actorID, "set_user_role", "user", userID, map[string]any{
		"email": user.Email,
		"role":  string(role),
	}); err != nil {
		return nil, err
	}
	return user, nil
}

func scanAdminUser(row scannable) (*model.AdminUser, error) {
	var user model.AdminUser
	var role string
	var createdAt, updatedAt time.Time
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&role,
		&user.IsActive,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	user.Role = normalizeUserRole(role)
	user.CreatedAt = formatTime(createdAt)
	user.UpdatedAt = formatTime(updatedAt)
	return &user, nil
}

func scanWaitlistEntry(row scannable) (*model.WaitlistEntry, error) {
	var entry model.WaitlistEntry
	var status string
	var submittedAt time.Time
	var reviewedAt *time.Time
	var reviewedBy *string
	if err := row.Scan(
		&entry.ID,
		&entry.Email,
		&status,
		&submittedAt,
		&reviewedAt,
		&reviewedBy,
	); err != nil {
		return nil, err
	}
	entry.Status = normalizeWaitlistStatus(status)
	entry.SubmittedAt = formatTime(submittedAt)
	if reviewedAt != nil {
		formatted := formatTime(*reviewedAt)
		entry.ReviewedAt = &formatted
	}
	entry.ReviewedBy = reviewedBy
	return &entry, nil
}

func normalizeWaitlistStatus(status string) model.WaitlistStatus {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "APPROVED":
		return model.WaitlistStatusApproved
	case "REJECTED":
		return model.WaitlistStatusRejected
	default:
		return model.WaitlistStatusPending
	}
}
