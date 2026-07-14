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
	ErrLastSignInMethod          = errors.New("keep at least one sign-in method")
	ErrGoogleAlreadyLinked       = errors.New("google already linked to another account")
)

// IsCredentialsAccount reports whether the user signed up with email and password.
// Prefer UserHasPasswordCredential / UserHasGoogleCredential for sign-in UI.
func IsCredentialsAccount(userID string) bool {
	return strings.HasPrefix(userID, "email-")
}

// UserHasPasswordCredential reports whether the user can sign in with email and password.
func UserHasPasswordCredential(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
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

// UserHasGoogleCredential reports whether Google is linked to this account.
func UserHasGoogleCredential(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
	var googleID *string
	err := pool.QueryRow(ctx, `
		SELECT google_id FROM users WHERE id = $1
	`, userID).Scan(&googleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, fmt.Errorf("lookup google: %w", err)
	}
	return googleID != nil && strings.TrimSpace(*googleID) != "", nil
}

// UserCanChangeEmail reports whether the signed-in user may update their login email.
// Requires a local password so ownership can be verified.
func UserCanChangeEmail(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
	return UserHasPasswordCredential(ctx, pool, userID)
}

func (p *Postgres) ChangePassword(userID, currentPassword, newPassword string) error {
	return ChangePassword(p.ctx(), p.pool, userID, currentPassword, newPassword)
}

func (p *Postgres) SetPassword(userID, newPassword string) error {
	return SetPassword(p.ctx(), p.pool, userID, newPassword)
}

func (p *Postgres) RemovePassword(userID string) error {
	return RemovePassword(p.ctx(), p.pool, userID)
}

func (p *Postgres) UnlinkGoogle(userID string) error {
	return UnlinkGoogle(p.ctx(), p.pool, userID)
}

func (p *Postgres) ChangeEmail(userID, currentPassword, newEmail string, verificationRequired bool) (*model.User, error) {
	return ChangeEmail(p.ctx(), p.pool, userID, currentPassword, newEmail, verificationRequired)
}

// ChangePassword updates the bcrypt hash for an account that already has a password.
func ChangePassword(ctx context.Context, pool *pgxpool.Pool, userID, currentPassword, newPassword string) error {
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

// SetPassword adds a local password to an account that does not have one yet (e.g. Google-only).
func SetPassword(ctx context.Context, pool *pgxpool.Pool, userID, newPassword string) error {
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
	if strings.TrimSpace(passwordHash) != "" {
		return fmt.Errorf("password already set, use change password instead")
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
		return fmt.Errorf("set password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RemovePassword clears the local password when Google remains as a sign-in method.
func RemovePassword(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	hasGoogle, err := UserHasGoogleCredential(ctx, pool, userID)
	if err != nil {
		return err
	}
	if !hasGoogle {
		return ErrLastSignInMethod
	}

	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users SET password_hash = NULL, updated_at = $2 WHERE id = $1
	`, userID, now)
	if err != nil {
		return fmt.Errorf("remove password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UnlinkGoogle clears the Google identity when a local password remains.
func UnlinkGoogle(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	hasPassword, err := UserHasPasswordCredential(ctx, pool, userID)
	if err != nil {
		return err
	}
	if !hasPassword {
		return ErrLastSignInMethod
	}

	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users SET google_id = NULL, updated_at = $2 WHERE id = $1
	`, userID, now)
	if err != nil {
		return fmt.Errorf("unlink google: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ChangeEmail updates the login email for an account that has a local password.
func ChangeEmail(ctx context.Context, pool *pgxpool.Pool, userID, currentPassword, rawEmail string, verificationRequired bool) (*model.User, error) {
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
		return nil, ErrEmailManagedExternally
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

// ResolveGoogleIdentity maps a Google OAuth identity to an existing or new user ID.
// If the Google email matches an existing account, Google is linked to that account.
func ResolveGoogleIdentity(ctx context.Context, pool *pgxpool.Pool, googleID, email string) (string, error) {
	googleID = strings.TrimSpace(googleID)
	if googleID == "" {
		return "", fmt.Errorf("google id required")
	}
	if err := auth.ValidateEmail(email); err != nil {
		return "", err
	}
	normalizedEmail := auth.NormalizeEmail(email)
	newUserID := auth.UserIDFromGoogleSub(googleID)

	var byGoogle string
	err := pool.QueryRow(ctx, `
		SELECT id FROM users WHERE google_id = $1
	`, googleID).Scan(&byGoogle)
	if err == nil {
		return byGoogle, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("lookup google: %w", err)
	}

	var byEmail string
	err = pool.QueryRow(ctx, `
		SELECT id FROM users WHERE LOWER(email) = $1
	`, normalizedEmail).Scan(&byEmail)
	if err == nil {
		now := time.Now().UTC()
		tag, linkErr := pool.Exec(ctx, `
			UPDATE users SET
				google_id = $2,
				email_verified_at = COALESCE(email_verified_at, $3),
				updated_at = $3
			WHERE id = $1
			  AND (google_id IS NULL OR google_id = $2)
		`, byEmail, googleID, now)
		if linkErr != nil {
			if isUniqueViolation(linkErr) {
				return "", ErrGoogleAlreadyLinked
			}
			return "", fmt.Errorf("link google: %w", linkErr)
		}
		if tag.RowsAffected() == 0 {
			return "", ErrGoogleAlreadyLinked
		}
		return byEmail, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("lookup email: %w", err)
	}

	return newUserID, nil
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "idx_users_google_id")
}
