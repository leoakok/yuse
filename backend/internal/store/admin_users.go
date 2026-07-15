package store

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

// ListAdminUsers returns paginated platform users for the admin panel.
// query matches email or display name (case-insensitive contains).
func ListAdminUsers(ctx context.Context, pool *pgxpool.Pool, limit, offset int, query string) ([]*model.AdminUser, error) {
	if limit < 1 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	yearMonth := CurrentLLMYearMonth()
	pattern := adminUserSearchPattern(query)

	rows, err := pool.Query(ctx, `
		SELECT u.id, u.email, u.display_name, u.role, u.is_active,
		       u.ai_enabled, u.ai_monthly_token_limit,
		       COALESCE(m.prompt_tokens, 0) + COALESCE(m.completion_tokens, 0),
		       COALESCE(m.request_count, 0),
		       u.created_at, u.updated_at
		FROM users u
		LEFT JOIN llm_usage_monthly m
		  ON m.user_id = u.id AND m.year_month = $1
		WHERE ($2 = '' OR u.email ILIKE $2 ESCAPE '\' OR u.display_name ILIKE $2 ESCAPE '\')
		ORDER BY u.created_at DESC
		LIMIT $3 OFFSET $4
	`, yearMonth, pattern, limit, offset)
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

func adminUserSearchPattern(query string) string {
	q := strings.TrimSpace(query)
	if q == "" {
		return ""
	}
	q = strings.ReplaceAll(q, `\`, `\\`)
	q = strings.ReplaceAll(q, `%`, `\%`)
	q = strings.ReplaceAll(q, `_`, `\_`)
	return "%" + q + "%"
}

func getAdminUser(ctx context.Context, pool *pgxpool.Pool, userID string) (*model.AdminUser, error) {
	yearMonth := CurrentLLMYearMonth()
	row := pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.display_name, u.role, u.is_active,
		       u.ai_enabled, u.ai_monthly_token_limit,
		       COALESCE(m.prompt_tokens, 0) + COALESCE(m.completion_tokens, 0),
		       COALESCE(m.request_count, 0),
		       u.created_at, u.updated_at
		FROM users u
		LEFT JOIN llm_usage_monthly m
		  ON m.user_id = u.id AND m.year_month = $2
		WHERE u.id = $1
	`, userID, yearMonth)
	user, err := scanAdminUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, err
	}
	return user, nil
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

	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET is_active = $2, updated_at = $3
		WHERE id = $1
	`, userID, active, time.Now().UTC())
	if err != nil {
		return nil, fmt.Errorf("set user active: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("user not found")
	}

	user, err := getAdminUser(ctx, pool, userID)
	if err != nil {
		return nil, err
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

	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET role = $2, updated_at = $3
		WHERE id = $1
	`, userID, string(role), time.Now().UTC())
	if err != nil {
		return nil, fmt.Errorf("set user role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("user not found")
	}

	user, err := getAdminUser(ctx, pool, userID)
	if err != nil {
		return nil, err
	}

	if err := RecordAdminAudit(ctx, pool, actorID, "set_user_role", "user", userID, map[string]any{
		"email": user.Email,
		"role":  string(role),
	}); err != nil {
		return nil, err
	}
	return user, nil
}

// SetUserAiLimits updates AI kill switch and optional monthly token override.
// A nil aiMonthlyTokenLimit clears the per-user override (platform default applies).
func SetUserAiLimits(
	ctx context.Context,
	pool *pgxpool.Pool,
	actorID, userID string,
	aiEnabled bool,
	aiMonthlyTokenLimit *int64,
) (*model.AdminUser, error) {
	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET ai_enabled = $2,
		    ai_monthly_token_limit = $3,
		    updated_at = $4
		WHERE id = $1
	`, userID, aiEnabled, aiMonthlyTokenLimit, time.Now().UTC())
	if err != nil {
		return nil, fmt.Errorf("set user ai limits: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("user not found")
	}

	user, err := getAdminUser(ctx, pool, userID)
	if err != nil {
		return nil, err
	}

	meta := map[string]any{
		"email":     user.Email,
		"aiEnabled": aiEnabled,
	}
	if aiMonthlyTokenLimit != nil {
		meta["aiMonthlyTokenLimit"] = *aiMonthlyTokenLimit
	} else {
		meta["aiMonthlyTokenLimit"] = nil
	}
	if err := RecordAdminAudit(ctx, pool, actorID, "set_user_ai_limits", "user", userID, meta); err != nil {
		return nil, err
	}
	return user, nil
}

func scanAdminUser(row scannable) (*model.AdminUser, error) {
	var user model.AdminUser
	var role string
	var createdAt, updatedAt time.Time
	var override *int64
	var tokensUsed, requestCount int64
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&role,
		&user.IsActive,
		&user.AiEnabled,
		&override,
		&tokensUsed,
		&requestCount,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	user.Role = normalizeUserRole(role)
	user.CreatedAt = formatTime(createdAt)
	user.UpdatedAt = formatTime(updatedAt)
	user.AiTokensUsedThisMonth = clampGraphQLInt(tokensUsed)
	user.AiRequestsThisMonth = clampGraphQLInt(requestCount)
	effective := EffectiveAIMonthlyTokenLimit(override)
	user.AiEffectiveLimit = clampGraphQLInt(effective)
	if override != nil {
		limit := clampGraphQLInt(*override)
		user.AiMonthlyTokenLimit = &limit
	}
	return &user, nil
}

func clampGraphQLInt(v int64) int {
	if v > math.MaxInt32 {
		return math.MaxInt32
	}
	if v < math.MinInt32 {
		return math.MinInt32
	}
	return int(v)
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
