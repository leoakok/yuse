package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

const ProviderGitHub = "github"

type UserConnection struct {
	ID             string
	UserID         string
	Provider       string
	AccessToken    string
	RefreshToken   string
	TokenExpiresAt *time.Time
	Metadata       map[string]any
	ConnectedAt    time.Time
	UpdatedAt      time.Time
}

func (p *Postgres) GitHubAccessToken() string {
	if p == nil || p.activeUserID() == "" {
		return ""
	}
	conn, err := GetUserConnection(p.ctx(), p.pool, p.activeUserID(), ProviderGitHub)
	if err != nil || conn == nil {
		return ""
	}
	return strings.TrimSpace(conn.AccessToken)
}

func (p *Postgres) ConnectionStatus(provider string) (*model.ConnectionStatus, error) {
	provider = normalizeConnectionProvider(provider)
	conn, err := GetUserConnection(p.ctx(), p.pool, p.activeUserID(), provider)
	if err != nil {
		return nil, err
	}
	return connectionToStatus(provider, conn), nil
}

func (p *Postgres) DisconnectConnection(provider string) (bool, error) {
	provider = normalizeConnectionProvider(provider)
	return DeleteUserConnection(p.ctx(), p.pool, p.activeUserID(), provider)
}

func normalizeConnectionProvider(provider string) string {
	return strings.ToLower(strings.TrimSpace(provider))
}

func connectionToStatus(provider string, conn *UserConnection) *model.ConnectionStatus {
	status := &model.ConnectionStatus{
		Provider: model.ConnectionProvider(strings.ToUpper(provider)),
		Connected: false,
	}
	if conn == nil || strings.TrimSpace(conn.AccessToken) == "" {
		return status
	}
	status.Connected = true
	if login, ok := conn.Metadata["login"].(string); ok {
		status.Username = &login
	}
	if avatar, ok := conn.Metadata["avatar_url"].(string); ok && avatar != "" {
		status.AvatarURL = &avatar
	}
	connectedAt := conn.ConnectedAt.UTC().Format(time.RFC3339)
	status.ConnectedAt = &connectedAt
	return status
}

func GetUserConnection(ctx context.Context, pool *pgxpool.Pool, userID, provider string) (*UserConnection, error) {
	provider = normalizeConnectionProvider(provider)
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, provider, access_token, refresh_token, token_expires_at, metadata, connected_at, updated_at
		FROM user_connections
		WHERE user_id = $1 AND provider = $2
	`, userID, provider)

	var (
		conn       UserConnection
		refresh    *string
		expires    *time.Time
		metadataRaw []byte
	)
	err := row.Scan(
		&conn.ID, &conn.UserID, &conn.Provider, &conn.AccessToken, &refresh, &expires,
		&metadataRaw, &conn.ConnectedAt, &conn.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get user connection: %w", err)
	}
	if refresh != nil {
		conn.RefreshToken = *refresh
	}
	conn.TokenExpiresAt = expires
	conn.Metadata = parseJSONMap(metadataRaw)
	return &conn, nil
}

func UpsertUserConnection(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID, provider, accessToken, refreshToken string,
	tokenExpiresAt *time.Time,
	metadata map[string]any,
) (*UserConnection, error) {
	provider = normalizeConnectionProvider(provider)
	now := time.Now().UTC()
	id := "conn-" + uuid.NewString()[:12]

	var refreshPtr *string
	if strings.TrimSpace(refreshToken) != "" {
		v := strings.TrimSpace(refreshToken)
		refreshPtr = &v
	}

	row := pool.QueryRow(ctx, `
		INSERT INTO user_connections (id, user_id, provider, access_token, refresh_token, token_expires_at, metadata, connected_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
		ON CONFLICT (user_id, provider) DO UPDATE SET
			access_token = EXCLUDED.access_token,
			refresh_token = COALESCE(EXCLUDED.refresh_token, user_connections.refresh_token),
			token_expires_at = EXCLUDED.token_expires_at,
			metadata = EXCLUDED.metadata,
			updated_at = EXCLUDED.updated_at
		RETURNING id, user_id, provider, access_token, refresh_token, token_expires_at, metadata, connected_at, updated_at
	`, id, userID, provider, accessToken, refreshPtr, tokenExpiresAt, jsonBytes(metadata), now)

	var (
		conn       UserConnection
		refresh    *string
		expires    *time.Time
		metadataRaw []byte
	)
	if err := row.Scan(
		&conn.ID, &conn.UserID, &conn.Provider, &conn.AccessToken, &refresh, &expires,
		&metadataRaw, &conn.ConnectedAt, &conn.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("upsert user connection: %w", err)
	}
	if refresh != nil {
		conn.RefreshToken = *refresh
	}
	conn.TokenExpiresAt = expires
	conn.Metadata = parseJSONMap(metadataRaw)
	return &conn, nil
}

func DeleteUserConnection(ctx context.Context, pool *pgxpool.Pool, userID, provider string) (bool, error) {
	provider = normalizeConnectionProvider(provider)
	tag, err := pool.Exec(ctx, `
		DELETE FROM user_connections WHERE user_id = $1 AND provider = $2
	`, userID, provider)
	if err != nil {
		return false, fmt.Errorf("delete user connection: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func GitHubMetadataFromUserAPI(user map[string]any) map[string]any {
	meta := map[string]any{}
	if login, ok := user["login"].(string); ok {
		meta["login"] = login
	}
	if avatar, ok := user["avatar_url"].(string); ok {
		meta["avatar_url"] = avatar
	}
	if name, ok := user["name"].(string); ok && name != "" {
		meta["name"] = name
	}
	if id, ok := user["id"].(float64); ok {
		meta["github_id"] = int64(id)
	}
	raw, _ := json.Marshal(meta)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	if out == nil {
		return map[string]any{}
	}
	return out
}
