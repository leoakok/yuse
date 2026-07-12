package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const ProviderLinkedInSession = "linkedin_session"

func encryptTokenRequired(plaintext string) (string, error) {
	cipher := loadTokenCipher()
	if cipher == nil {
		return "", fmt.Errorf("ENCRYPTION_KEY or AUTH_SECRET is required to store LinkedIn session")
	}
	return cipher.Encrypt(plaintext)
}

// SaveLinkedInSessionForUser encrypts and stores the LinkedIn session cookie for a user.
func SaveLinkedInSessionForUser(ctx context.Context, pool *pgxpool.Pool, userID, cookie string) (*time.Time, error) {
	cookie = strings.TrimSpace(cookie)
	if cookie == "" {
		return nil, fmt.Errorf("cookie is required")
	}
	if _, err := encryptTokenRequired(cookie); err != nil {
		return nil, err
	}
	conn, err := UpsertUserConnection(ctx, pool, userID, ProviderLinkedInSession, cookie, "", nil, nil)
	if err != nil {
		return nil, err
	}
	updated := conn.UpdatedAt.UTC()
	return &updated, nil
}

// ClearLinkedInSessionForUser removes the stored LinkedIn session for a user.
func ClearLinkedInSessionForUser(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	_, err := DeleteUserConnection(ctx, pool, userID, ProviderLinkedInSession)
	return err
}

// LinkedInSessionStatusForUser reports whether a LinkedIn session is configured.
func LinkedInSessionStatusForUser(ctx context.Context, pool *pgxpool.Pool, userID string) (configured bool, updatedAt *time.Time, err error) {
	conn, err := GetUserConnection(ctx, pool, userID, ProviderLinkedInSession)
	if err != nil {
		return false, nil, err
	}
	if conn == nil || strings.TrimSpace(conn.AccessToken) == "" {
		return false, nil, nil
	}
	updated := conn.UpdatedAt.UTC()
	return true, &updated, nil
}

// LinkedInSessionCookieForUser decrypts the stored LinkedIn session cookie.
func LinkedInSessionCookieForUser(ctx context.Context, pool *pgxpool.Pool, userID string) (string, error) {
	conn, err := GetUserConnection(ctx, pool, userID, ProviderLinkedInSession)
	if err != nil {
		return "", err
	}
	if conn == nil || strings.TrimSpace(conn.AccessToken) == "" {
		return "", fmt.Errorf("linkedin session is not configured")
	}
	return conn.AccessToken, nil
}

func (p *Postgres) SaveLinkedInSession(cookie string) (bool, *time.Time, error) {
	userID := p.activeUserID()
	if userID == "" {
		return false, nil, fmt.Errorf("not authenticated")
	}
	updatedAt, err := SaveLinkedInSessionForUser(p.ctx(), p.pool, userID, cookie)
	if err != nil {
		return false, nil, err
	}
	return true, updatedAt, nil
}

func (p *Postgres) ClearLinkedInSession() (bool, error) {
	userID := p.activeUserID()
	if userID == "" {
		return false, fmt.Errorf("not authenticated")
	}
	cleared, err := DeleteUserConnection(p.ctx(), p.pool, userID, ProviderLinkedInSession)
	return cleared, err
}

func (p *Postgres) LinkedInSessionConfigured() (bool, *time.Time, error) {
	userID := p.activeUserID()
	if userID == "" {
		return false, nil, fmt.Errorf("not authenticated")
	}
	return LinkedInSessionStatusForUser(p.ctx(), p.pool, userID)
}
