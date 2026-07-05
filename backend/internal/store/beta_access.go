package store

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
)

// AccessStatus describes whether an email may create a new account during beta.
type AccessStatus string

const (
	AccessApproved AccessStatus = "approved"
	AccessPending  AccessStatus = "pending"
	AccessDenied   AccessStatus = "denied"
)

// ErrInviteRequired is returned when beta invite-only mode blocks a new signup.
var ErrInviteRequired = errors.New("invite required")

// ErrUserDeactivated is returned when an inactive user attempts to authenticate.
var ErrUserDeactivated = errors.New("account deactivated")

// BetaInviteOnly reports whether new signups require waitlist approval.
func BetaInviteOnly() bool {
	value := strings.TrimSpace(os.Getenv("BETA_INVITE_ONLY"))
	if value == "" {
		return false
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false
	}
	return parsed
}

// PublicAccessCheckStatus returns a reduced-leakage status for the public access-check endpoint.
// When beta invite-only mode is on, detailed waitlist status is returned only for emails on the
// waitlist. All other probes receive a generic denied response so rejected and unknown emails
// cannot be distinguished. SignupAccessStatus remains the authoritative check during registration.
func PublicAccessCheckStatus(ctx context.Context, pool *pgxpool.Pool, email string) (AccessStatus, error) {
	if !BetaInviteOnly() {
		return AccessApproved, nil
	}

	normalized := auth.NormalizeEmail(email)
	if RoleForEmail(normalized) == "ADMIN" {
		return AccessApproved, nil
	}

	var waitlistStatus string
	err := pool.QueryRow(ctx, `
		SELECT status FROM beta_waitlist WHERE LOWER(email) = LOWER($1)
	`, normalized).Scan(&waitlistStatus)
	if err == nil {
		switch strings.ToLower(strings.TrimSpace(waitlistStatus)) {
		case "approved":
			return AccessApproved, nil
		case "pending":
			return AccessPending, nil
		default:
			return AccessDenied, nil
		}
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("check waitlist: %w", err)
	}

	return AccessDenied, nil
}

// SignupAccessStatus returns whether an email may register or bootstrap a new account.
func SignupAccessStatus(ctx context.Context, pool *pgxpool.Pool, email string) (AccessStatus, error) {
	if !BetaInviteOnly() {
		return AccessApproved, nil
	}

	normalized := auth.NormalizeEmail(email)
	if RoleForEmail(normalized) == "ADMIN" {
		return AccessApproved, nil
	}

	var exists bool
	var isActive bool
	if err := pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)),
		       COALESCE((SELECT is_active FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1), TRUE)
	`, normalized).Scan(&exists, &isActive); err != nil {
		return "", fmt.Errorf("check existing user: %w", err)
	}
	if exists {
		if !isActive {
			return AccessDenied, nil
		}
		return AccessApproved, nil
	}

	var status string
	err := pool.QueryRow(ctx, `
		SELECT status FROM beta_waitlist WHERE LOWER(email) = LOWER($1)
	`, normalized).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return AccessDenied, nil
	}
	if err != nil {
		return "", fmt.Errorf("check waitlist: %w", err)
	}

	switch strings.ToLower(strings.TrimSpace(status)) {
	case "approved":
		return AccessApproved, nil
	case "pending":
		return AccessPending, nil
	default:
		return AccessDenied, nil
	}
}

// RequireSignupAccess returns an error when beta mode blocks a new signup.
func RequireSignupAccess(ctx context.Context, pool *pgxpool.Pool, email string) error {
	status, err := SignupAccessStatus(ctx, pool, email)
	if err != nil {
		return err
	}
	switch status {
	case AccessApproved:
		return nil
	case AccessPending:
		return fmt.Errorf("your email is on the waitlist")
	default:
		return ErrInviteRequired
	}
}

// JoinWaitlist records a beta waitlist request. Duplicate emails are idempotent.
func JoinWaitlist(ctx context.Context, pool *pgxpool.Pool, email string) error {
	if err := auth.ValidateEmail(email); err != nil {
		return err
	}
	normalized := auth.NormalizeEmail(email)
	now := time.Now().UTC()

	var existingStatus string
	err := pool.QueryRow(ctx, `
		SELECT status FROM beta_waitlist WHERE LOWER(email) = LOWER($1)
	`, normalized).Scan(&existingStatus)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check waitlist: %w", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO beta_waitlist (id, email, status, submitted_at)
		VALUES ($1, $2, 'pending', $3)
	`, "waitlist-"+uuid.NewString()[:12], normalized, now)
	if err != nil {
		return fmt.Errorf("insert waitlist: %w", err)
	}
	return nil
}

// IsUserActive reports whether a user account is active.
func IsUserActive(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
	var active bool
	err := pool.QueryRow(ctx, `
		SELECT is_active FROM users WHERE id = $1
	`, userID).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check user active: %w", err)
	}
	return active, nil
}
