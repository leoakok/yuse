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
	"github.com/leo/ai-weekend/backend/internal/auth"
)

var (
	ErrPasswordManagedExternally = errors.New("password managed externally")
	ErrEmailManagedExternally    = errors.New("email managed externally")
	ErrIncorrectPassword         = errors.New("incorrect password")
)

// IsCredentialsAccount reports whether the user signed up with email and password.
func IsCredentialsAccount(userID string) bool {
	return strings.HasPrefix(userID, "email-")
}

// UserHasPasswordCredential reports whether the user can change their password in settings.
func UserHasPasswordCredential(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
	if !IsCredentialsAccount(userID) {
		return false, nil
	}
	var hash string
	err := pool.QueryRow(ctx, `
		SELECT COALESCE(password_hash, '') FROM users WHERE id = $1
	`, userID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, fmt.Errorf("lookup password: %w", err)
	}
	return strings.TrimSpace(hash) != "", nil
}

// UserCanChangeEmail reports whether the signed-in user may update their login email.
func UserCanChangeEmail(userID string) bool {
	return IsCredentialsAccount(userID)
}

func (p *Postgres) ChangePassword(userID, currentPassword, newPassword string) error {
	return ChangePassword(p.ctx(), p.pool, userID, currentPassword, newPassword)
}

func (p *Postgres) ChangeEmail(userID, currentPassword, newEmail string, verificationRequired bool) (*model.User, error) {
	return ChangeEmail(p.ctx(), p.pool, userID, currentPassword, newEmail, verificationRequired)
}

// ChangePassword updates the bcrypt hash for a credentials-based account.
func ChangePassword(ctx context.Context, pool *pgxpool.Pool, userID, currentPassword, newPassword string) error {
	if !IsCredentialsAccount(userID) {
		return ErrPasswordManagedExternally
	}
	if err := auth.ValidatePassword(newPassword); err != nil {
		return err
	}

	var passwordHash string
	err := pool.QueryRow(ctx, `
		SELECT COALESCE(password_hash, '') FROM users WHERE id = $1
	`, userID).Scan(&passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("lookup user: %w", err)
	}
	if strings.TrimSpace(passwordHash) == "" {
		return ErrPasswordManagedExternally
	}
	if !auth.VerifyPassword(passwordHash, currentPassword) {
		return ErrIncorrectPassword
	}
	if auth.VerifyPassword(passwordHash, newPassword) {
		return fmt.Errorf("choose a different password than your current one")
	}

	newHash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1
	`, userID, newHash, now)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ChangeEmail updates the login email for a credentials-based account.
func ChangeEmail(ctx context.Context, pool *pgxpool.Pool, userID, currentPassword, rawEmail string, verificationRequired bool) (*model.User, error) {
	if !IsCredentialsAccount(userID) {
		return nil, ErrEmailManagedExternally
	}
	if err := auth.ValidateEmail(rawEmail); err != nil {
		return nil, err
	}

	var passwordHash string
	err := pool.QueryRow(ctx, `
		SELECT COALESCE(password_hash, '') FROM users WHERE id = $1
	`, userID).Scan(&passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("lookup user: %w", err)
	}
	if strings.TrimSpace(passwordHash) == "" {
		return nil, ErrPasswordManagedExternally
	}
	if !auth.VerifyPassword(passwordHash, currentPassword) {
		return nil, ErrIncorrectPassword
	}

	normalized := auth.NormalizeEmail(rawEmail)

	var existingID string
	err = pool.QueryRow(ctx, `SELECT id FROM users WHERE LOWER(email) = $1`, normalized).Scan(&existingID)
	if err == nil && existingID != userID {
		return nil, fmt.Errorf("could not update email")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check email: %w", err)
	}

	now := time.Now().UTC()
	if verificationRequired {
		_, err = pool.Exec(ctx, `
			UPDATE users SET
				email = $2,
				email_verified_at = NULL,
				email_verification_token = NULL,
				email_verification_expires_at = NULL,
				updated_at = $3
			WHERE id = $1
		`, userID, normalized, now)
	} else {
		_, err = pool.Exec(ctx, `
			UPDATE users SET email = $2, email_verified_at = $3, updated_at = $3 WHERE id = $1
		`, userID, normalized, now)
	}
	if err != nil {
		return nil, fmt.Errorf("update email: %w", err)
	}
	return UserByID(ctx, pool, userID)
}
