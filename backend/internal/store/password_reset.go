package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
)

var ErrPasswordResetTokenInvalid = errors.New("password reset token invalid or expired")

// IssuePasswordResetToken stores a one-hour reset token for an email/password user.
func IssuePasswordResetToken(ctx context.Context, pool *pgxpool.Pool, email string) (string, error) {
	normalized := auth.NormalizeEmail(email)
	var userID string
	err := pool.QueryRow(ctx, `
		SELECT id FROM users
		WHERE LOWER(email) = $1
		  AND password_hash IS NOT NULL
		  AND is_active = true
	`, normalized).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", fmt.Errorf("lookup user for reset: %w", err)
	}

	token := uuid.NewString()
	expires := time.Now().UTC().Add(time.Hour)
	now := time.Now().UTC()
	_, err = pool.Exec(ctx, `
		UPDATE users
		SET password_reset_token = $2,
		    password_reset_expires_at = $3,
		    updated_at = $4
		WHERE id = $1
	`, userID, token, expires, now)
	if err != nil {
		return "", fmt.Errorf("store password reset token: %w", err)
	}
	return token, nil
}

// ResetPasswordByToken updates the password when the token is valid.
func ResetPasswordByToken(ctx context.Context, pool *pgxpool.Pool, token, newPassword string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return ErrPasswordResetTokenInvalid
	}
	if err := auth.ValidatePassword(newPassword); err != nil {
		return err
	}
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET password_hash = $2,
		    password_reset_token = NULL,
		    password_reset_expires_at = NULL,
		    updated_at = $3
		WHERE password_reset_token = $1
		  AND password_reset_expires_at IS NOT NULL
		  AND password_reset_expires_at > $3
	`, token, hash, now)
	if err != nil {
		return fmt.Errorf("reset password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPasswordResetTokenInvalid
	}
	return nil
}
