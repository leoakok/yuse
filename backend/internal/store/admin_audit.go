package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
)

// RecordAdminAudit appends an admin action to the audit log.
func RecordAdminAudit(ctx context.Context, pool *pgxpool.Pool, actorID, action, targetType, targetID string, metadata map[string]any) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, metadata, created_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
	`, "audit-"+uuid.NewString()[:12], actorID, action, targetType, targetID, jsonBytes(metadata), time.Now().UTC())
	if err != nil {
		return fmt.Errorf("record audit: %w", err)
	}
	return nil
}

// ListAdminAuditLog returns recent admin audit entries (admin only, caller must authorize).
func ListAdminAuditLog(ctx context.Context, pool *pgxpool.Pool, limit, offset int) ([]*model.AdminAuditLogEntry, error) {
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := pool.Query(ctx, `
		SELECT
			a.id,
			a.actor_id,
			u.email,
			a.action,
			a.target_type,
			a.target_id,
			a.metadata,
			a.created_at
		FROM admin_audit_log a
		JOIN users u ON u.id = a.actor_id
		ORDER BY a.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list audit log: %w", err)
	}
	defer rows.Close()

	out := make([]*model.AdminAuditLogEntry, 0, limit)
	for rows.Next() {
		entry, err := scanAdminAuditLogEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}

func scanAdminAuditLogEntry(row scannable) (*model.AdminAuditLogEntry, error) {
	var entry model.AdminAuditLogEntry
	var targetID *string
	var metadata []byte
	var createdAt time.Time
	if err := row.Scan(
		&entry.ID,
		&entry.ActorID,
		&entry.ActorEmail,
		&entry.Action,
		&entry.TargetType,
		&targetID,
		&metadata,
		&createdAt,
	); err != nil {
		return nil, err
	}
	entry.TargetID = targetID
	entry.Metadata = parseJSONMap(metadata)
	entry.CreatedAt = formatTime(createdAt)
	return &entry, nil
}
