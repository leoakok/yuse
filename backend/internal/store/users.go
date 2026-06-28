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
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/auth"
)

// SessionScope identifies the authenticated user and their workspace for a request.
type SessionScope struct {
	UserID      string
	WorkspaceID string
	ThreadID    string
}

// ErrSessionInvalid is returned when a valid JWT refers to a user that no longer exists
// and the request is not an explicit OAuth bootstrap.
var ErrSessionInvalid = errors.New("session invalid")

// EnsureSession validates the authenticated user and ensures a personal workspace + assistant thread exist.
// New users are created only when claims.Bootstrap is true (fresh OAuth sign-in).
func EnsureSession(ctx context.Context, pool *pgxpool.Pool, claims auth.Claims) (SessionScope, error) {
	userID := claims.UserID()
	workspaceID := auth.WorkspaceIDForUser(userID)
	now := time.Now().UTC()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return SessionScope{}, err
	}
	defer tx.Rollback(ctx)

	// Serialize bootstrap for the same user so parallel GraphQL requests (e.g. me +
	// myWorkspace on first login) cannot race inserts before the user row exists.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1::text))`, userID); err != nil {
		return SessionScope{}, fmt.Errorf("session lock: %w", err)
	}

	var userExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&userExists); err != nil {
		return SessionScope{}, fmt.Errorf("check user: %w", err)
	}

	if !userExists {
		if !claims.Bootstrap {
			return SessionScope{}, ErrSessionInvalid
		}
		if err := createUserFromClaims(ctx, tx, claims, userID, now); err != nil {
			return SessionScope{}, err
		}
	} else if err := syncUserFromClaims(ctx, tx, claims, userID, now); err != nil {
		return SessionScope{}, err
	}

	threadID, err := ensureWorkspaceAndThread(ctx, tx, claims, userID, workspaceID, now)
	if err != nil {
		return SessionScope{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return SessionScope{}, err
	}

	return SessionScope{
		UserID:      userID,
		WorkspaceID: workspaceID,
		ThreadID:    threadID,
	}, nil
}

func createUserFromClaims(ctx context.Context, tx pgx.Tx, claims auth.Claims, userID string, now time.Time) error {
	googleID := strings.TrimSpace(claims.GoogleID)
	var existingUserID string
	err := tx.QueryRow(ctx, `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, strings.TrimSpace(claims.Email)).Scan(&existingUserID)
	if err == nil && existingUserID != userID {
		return fmt.Errorf("email already registered with a different sign-in method")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check email: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, display_name, avatar_url, google_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $6)
	`, userID, strings.TrimSpace(claims.Email), strings.TrimSpace(claims.Name),
		strings.TrimSpace(claims.Picture), googleID, now)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func syncUserFromClaims(ctx context.Context, tx pgx.Tx, claims auth.Claims, userID string, now time.Time) error {
	googleID := strings.TrimSpace(claims.GoogleID)
	_, err := tx.Exec(ctx, `
		UPDATE users SET
			email = $2,
			display_name = $3,
			avatar_url = CASE
				WHEN $4::text IS NOT NULL AND $4::text <> '' THEN $4::text
				ELSE avatar_url
			END,
			google_id = COALESCE(NULLIF($5::text, ''), google_id),
			updated_at = $6
		WHERE id = $1
	`, userID, strings.TrimSpace(claims.Email), strings.TrimSpace(claims.Name),
		strings.TrimSpace(claims.Picture), googleID, now)
	if err != nil {
		return fmt.Errorf("sync user: %w", err)
	}
	return nil
}

func ensureWorkspaceAndThread(ctx context.Context, tx pgx.Tx, claims auth.Claims, userID, workspaceID string, now time.Time) (string, error) {
	slug := slugFromEmail(claims.Email)
	_, err := tx.Exec(ctx, `
		INSERT INTO workspaces (id, name, slug, owner_id, plan, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'free', $5, $5)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			updated_at = EXCLUDED.updated_at
	`, workspaceID, personalWorkspaceName(claims.Name), slug, userID, now)
	if err != nil {
		return "", fmt.Errorf("upsert workspace: %w", err)
	}

	var threadID string
	err = tx.QueryRow(ctx, `
		SELECT id FROM assistant_threads WHERE workspace_id = $1 ORDER BY created_at LIMIT 1
	`, workspaceID).Scan(&threadID)
	if err != nil {
		threadID = "thread-" + uuid.NewString()[:8]
		_, err = tx.Exec(ctx, `
			INSERT INTO assistant_threads (id, workspace_id, created_at, updated_at)
			VALUES ($1, $2, $3, $3)
		`, threadID, workspaceID, now)
		if err != nil {
			return "", fmt.Errorf("create assistant thread: %w", err)
		}
	}
	return threadID, nil
}

// RegisterEmailUser creates a password-based account with workspace and assistant thread.
func RegisterEmailUser(ctx context.Context, pool *pgxpool.Pool, email, password, displayName string) (SessionScope, error) {
	if err := auth.ValidateEmail(email); err != nil {
		return SessionScope{}, err
	}
	if err := auth.ValidatePassword(password); err != nil {
		return SessionScope{}, err
	}

	normalizedEmail := auth.NormalizeEmail(email)
	name := strings.TrimSpace(displayName)
	if name == "" {
		name = displayNameFromEmail(normalizedEmail)
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return SessionScope{}, err
	}

	accountID := uuid.NewString()
	userID := auth.UserIDFromEmailAccount(accountID)
	workspaceID := auth.WorkspaceIDForUser(userID)
	now := time.Now().UTC()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return SessionScope{}, err
	}
	defer tx.Rollback(ctx)

	var existingID string
	err = tx.QueryRow(ctx, `SELECT id FROM users WHERE LOWER(email) = $1`, normalizedEmail).Scan(&existingID)
	if err == nil {
		return SessionScope{}, fmt.Errorf("email already registered")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return SessionScope{}, fmt.Errorf("check email: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
	`, userID, normalizedEmail, name, hash, now)
	if err != nil {
		return SessionScope{}, fmt.Errorf("create user: %w", err)
	}

	slug := slugFromEmail(normalizedEmail)
	_, err = tx.Exec(ctx, `
		INSERT INTO workspaces (id, name, slug, owner_id, plan, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'free', $5, $5)
	`, workspaceID, personalWorkspaceName(name), slug, userID, now)
	if err != nil {
		return SessionScope{}, fmt.Errorf("create workspace: %w", err)
	}

	threadID := "thread-" + uuid.NewString()[:8]
	_, err = tx.Exec(ctx, `
		INSERT INTO assistant_threads (id, workspace_id, created_at, updated_at)
		VALUES ($1, $2, $3, $3)
	`, threadID, workspaceID, now)
	if err != nil {
		return SessionScope{}, fmt.Errorf("create assistant thread: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return SessionScope{}, err
	}

	return SessionScope{
		UserID:      userID,
		WorkspaceID: workspaceID,
		ThreadID:    threadID,
	}, nil
}

// AuthenticateEmailUser verifies email/password credentials.
func AuthenticateEmailUser(ctx context.Context, pool *pgxpool.Pool, email, password string) (auth.Claims, error) {
	if err := auth.ValidateEmail(email); err != nil {
		return auth.Claims{}, fmt.Errorf("invalid credentials")
	}
	if strings.TrimSpace(password) == "" {
		return auth.Claims{}, fmt.Errorf("invalid credentials")
	}

	normalizedEmail := auth.NormalizeEmail(email)
	var (
		userID      string
		displayName string
		passwordHash string
	)
	err := pool.QueryRow(ctx, `
		SELECT id, display_name, COALESCE(password_hash, '')
		FROM users
		WHERE LOWER(email) = $1
	`, normalizedEmail).Scan(&userID, &displayName, &passwordHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return auth.Claims{}, fmt.Errorf("invalid credentials")
		}
		return auth.Claims{}, fmt.Errorf("lookup user: %w", err)
	}
	if !strings.HasPrefix(userID, "email-") {
		return auth.Claims{}, fmt.Errorf("invalid credentials")
	}
	if !auth.VerifyPassword(passwordHash, password) {
		return auth.Claims{}, fmt.Errorf("invalid credentials")
	}

	return auth.Claims{
		Sub:   userID,
		Email: normalizedEmail,
		Name:  displayName,
	}, nil
}

func displayNameFromEmail(email string) string {
	local := strings.Split(email, "@")[0]
	local = strings.ReplaceAll(local, ".", " ")
	local = strings.TrimSpace(local)
	if local == "" {
		return "User"
	}
	return strings.ToUpper(local[:1]) + local[1:]
}

func slugFromEmail(email string) string {
	local := strings.ToLower(strings.Split(email, "@")[0])
	local = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return '-'
	}, local)
	local = strings.Trim(local, "-")
	if local == "" {
		return "workspace"
	}
	return local
}

func personalWorkspaceName(displayName string) string {
	name := strings.TrimSpace(displayName)
	if name == "" {
		return "Personal"
	}
	return name + "'s workspace"
}

// UserByID loads a user row for the me query.
func UserByID(ctx context.Context, pool *pgxpool.Pool, userID string) (*model.User, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, email, display_name, avatar_url, created_at, updated_at
		FROM users WHERE id = $1
	`, userID)
	return scanUser(row)
}

// WorkspaceByID loads a workspace row for the myWorkspace query.
func WorkspaceByID(ctx context.Context, pool *pgxpool.Pool, workspaceID string) (*model.Workspace, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, name, slug, owner_id, plan, created_at, updated_at
		FROM workspaces WHERE id = $1
	`, workspaceID)
	return scanWorkspace(row)
}
