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
)

var ErrEmailNotVerified = errors.New("email not verified")
var ErrVerificationTokenInvalid = errors.New("verification token invalid or expired")

// IsUserEmailVerified reports whether the user has confirmed their email address.
func IsUserEmailVerified(ctx context.Context, pool *pgxpool.Pool, userID string) (bool, error) {
	var verifiedAt *time.Time
	err := pool.QueryRow(ctx, `
		SELECT email_verified_at FROM users WHERE id = $1
	`, userID).Scan(&verifiedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, fmt.Errorf("lookup email verification: %w", err)
	}
	return verifiedAt != nil, nil
}

// RequireVerifiedEmailForLLM returns an error when verification is required and missing.
func RequireVerifiedEmailForLLM(ctx context.Context, pool *pgxpool.Pool, userID string, verificationRequired bool) error {
	if !verificationRequired {
		return nil
	}
	verified, err := IsUserEmailVerified(ctx, pool, userID)
	if err != nil {
		return err
	}
	if !verified {
		return ErrEmailNotVerified
	}
	return nil
}

// IssueEmailVerificationToken stores a fresh verification token for the user.
func IssueEmailVerificationToken(ctx context.Context, pool *pgxpool.Pool, userID string) (string, error) {
	token := uuid.NewString()
	expires := time.Now().UTC().Add(24 * time.Hour)
	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET email_verification_token = $2,
		    email_verification_expires_at = $3,
		    updated_at = $4
		WHERE id = $1
	`, userID, token, expires, now)
	if err != nil {
		return "", fmt.Errorf("store verification token: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return "", ErrNotFound
	}
	return token, nil
}

// VerifyEmailByToken marks the user's email verified when the token is valid.
func VerifyEmailByToken(ctx context.Context, pool *pgxpool.Pool, token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return ErrVerificationTokenInvalid
	}
	now := time.Now().UTC()
	tag, err := pool.Exec(ctx, `
		UPDATE users
		SET email_verified_at = $2,
		    email_verification_token = NULL,
		    email_verification_expires_at = NULL,
		    updated_at = $2
		WHERE email_verification_token = $1
		  AND email_verification_expires_at IS NOT NULL
		  AND email_verification_expires_at > $2
	`, token, now)
	if err != nil {
		return fmt.Errorf("verify email: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrVerificationTokenInvalid
	}
	return nil
}
