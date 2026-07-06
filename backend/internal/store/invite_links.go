package store

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/auth"
)

const inviteCodeAlphabet = "abcdefghijklmnopqrstuvwxyz23456789"
const inviteCodeLength = 10

var (
	ErrInviteNotFound   = errors.New("invite not found")
	ErrInviteInactive   = errors.New("invite inactive")
	ErrInviteExpired    = errors.New("invite expired")
	ErrInviteExhausted  = errors.New("invite exhausted")
	ErrInviteEmailMatch = errors.New("invite email mismatch")
	ErrInviteRedeemed   = errors.New("invite already redeemed for this email")
)

// PublicInvitePreview is a safe subset of invite link data for the redeem page.
type PublicInvitePreview struct {
	Code          string
	Label         *string
	EmailRestrict *string
	RemainingUses *int
	Expired       bool
}

func inviteURLPath(code string) string {
	return "/r/" + strings.TrimSpace(code)
}

func generateInviteCode() (string, error) {
	b := make([]byte, inviteCodeLength)
	max := big.NewInt(int64(len(inviteCodeAlphabet)))
	for i := range b {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b[i] = inviteCodeAlphabet[n.Int64()]
	}
	return string(b), nil
}

func scanInviteLink(row scannable) (*model.InviteLink, error) {
	var link model.InviteLink
	var label, emailRestrict *string
	var maxUses *int
	var createdAt time.Time
	var expiresAt *time.Time
	err := row.Scan(
		&link.ID,
		&link.Code,
		&label,
		&emailRestrict,
		&maxUses,
		&link.UseCount,
		&link.IsActive,
		&createdAt,
		&expiresAt,
	)
	if err != nil {
		return nil, err
	}
	link.Label = label
	link.EmailRestrict = emailRestrict
	link.MaxUses = maxUses
	link.CreatedAt = formatTime(createdAt)
	if expiresAt != nil {
		formatted := formatTime(*expiresAt)
		link.ExpiresAt = &formatted
	}
	link.URLPath = inviteURLPath(link.Code)
	return &link, nil
}

func inviteExpired(expiresAt *time.Time, now time.Time) bool {
	return expiresAt != nil && now.After(*expiresAt)
}

func inviteRemainingUses(useCount int, maxUses *int) *int {
	if maxUses == nil {
		return nil
	}
	remaining := *maxUses - useCount
	if remaining < 0 {
		remaining = 0
	}
	return &remaining
}

// PublicInvitePreviewByCode returns invite metadata for the /r/{code} page.
func PublicInvitePreviewByCode(ctx context.Context, pool *pgxpool.Pool, code string) (*PublicInvitePreview, error) {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return nil, ErrInviteNotFound
	}

	var preview PublicInvitePreview
	var label, emailRestrict *string
	var maxUses *int
	var useCount int
	var isActive bool
	var expiresAt *time.Time
	err := pool.QueryRow(ctx, `
		SELECT code, label, email_restrict, max_uses, use_count, is_active, expires_at
		FROM beta_invite_links
		WHERE LOWER(code) = LOWER($1)
	`, trimmed).Scan(
		&preview.Code,
		&label,
		&emailRestrict,
		&maxUses,
		&useCount,
		&isActive,
		&expiresAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrInviteNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("lookup invite: %w", err)
	}

	now := time.Now().UTC()
	expired := !isActive || inviteExpired(expiresAt, now)
	preview.Label = label
	preview.EmailRestrict = emailRestrict
	preview.Expired = expired
	preview.RemainingUses = inviteRemainingUses(useCount, maxUses)
	return &preview, nil
}

// ClaimInviteLink records a redemption and approves beta access for the email.
func ClaimInviteLink(ctx context.Context, pool *pgxpool.Pool, code, email string) error {
	if err := auth.ValidateEmail(email); err != nil {
		return err
	}
	normalized := auth.NormalizeEmail(email)
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		return ErrInviteNotFound
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var (
		inviteID      string
		emailRestrict *string
		maxUses       *int
		useCount      int
		isActive      bool
		expiresAt     *time.Time
	)
	err = tx.QueryRow(ctx, `
		SELECT id, email_restrict, max_uses, use_count, is_active, expires_at
		FROM beta_invite_links
		WHERE LOWER(code) = LOWER($1)
		FOR UPDATE
	`, trimmedCode).Scan(&inviteID, &emailRestrict, &maxUses, &useCount, &isActive, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrInviteNotFound
	}
	if err != nil {
		return fmt.Errorf("lookup invite: %w", err)
	}
	if !isActive {
		return ErrInviteInactive
	}
	now := time.Now().UTC()
	if inviteExpired(expiresAt, now) {
		return ErrInviteExpired
	}
	if emailRestrict != nil && strings.TrimSpace(*emailRestrict) != "" {
		if !strings.EqualFold(strings.TrimSpace(*emailRestrict), normalized) {
			return ErrInviteEmailMatch
		}
	}
	if maxUses != nil && useCount >= *maxUses {
		return ErrInviteExhausted
	}

	var already bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM beta_invite_redemptions
			WHERE invite_id = $1 AND LOWER(email) = LOWER($2)
		)
	`, inviteID, normalized).Scan(&already); err != nil {
		return fmt.Errorf("check redemption: %w", err)
	}
	if already {
		return ErrInviteRedeemed
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO beta_invite_redemptions (id, invite_id, email, redeemed_at)
		VALUES ($1, $2, $3, $4)
	`, "redeem-"+uuid.NewString()[:12], inviteID, normalized, now)
	if err != nil {
		return fmt.Errorf("insert redemption: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE beta_invite_links SET use_count = use_count + 1 WHERE id = $1
	`, inviteID)
	if err != nil {
		return fmt.Errorf("increment invite use count: %w", err)
	}

	if err := approveWaitlistEmailTx(ctx, tx, normalized, now); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func approveWaitlistEmailTx(ctx context.Context, tx pgx.Tx, email string, now time.Time) error {
	var existingID string
	err := tx.QueryRow(ctx, `
		SELECT id FROM beta_waitlist WHERE LOWER(email) = LOWER($1)
	`, email).Scan(&existingID)
	if err == nil {
		_, err = tx.Exec(ctx, `
			UPDATE beta_waitlist
			SET status = 'approved', reviewed_at = $2
			WHERE id = $1
		`, existingID, now)
		return err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check waitlist: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO beta_waitlist (id, email, status, submitted_at, reviewed_at)
		VALUES ($1, $2, 'approved', $3, $3)
	`, "waitlist-"+uuid.NewString()[:12], email, now)
	if err != nil {
		return fmt.Errorf("insert approved waitlist: %w", err)
	}
	return nil
}

func emailHasInviteRedemption(ctx context.Context, pool *pgxpool.Pool, email string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM beta_invite_redemptions r
			JOIN beta_invite_links l ON l.id = r.invite_id
			WHERE LOWER(r.email) = LOWER($1) AND l.is_active = TRUE
		)
	`, email).Scan(&exists)
	return exists, err
}

// ListInviteLinks returns all invite links for the admin panel.
func ListInviteLinks(ctx context.Context, pool *pgxpool.Pool) ([]*model.InviteLink, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, code, label, email_restrict, max_uses, use_count, is_active, created_at, expires_at
		FROM beta_invite_links
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list invite links: %w", err)
	}
	defer rows.Close()

	out := make([]*model.InviteLink, 0)
	for rows.Next() {
		link, err := scanInviteLink(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, link)
	}
	return out, rows.Err()
}

// CreateInviteLink inserts a new invite link (admin).
func CreateInviteLink(
	ctx context.Context,
	pool *pgxpool.Pool,
	actorID string,
	input model.CreateInviteLinkInput,
) (*model.InviteLink, error) {
	now := time.Now().UTC()
	code, err := generateInviteCode()
	if err != nil {
		return nil, err
	}

	var emailRestrict *string
	if input.EmailRestrict != nil {
		trimmed := strings.TrimSpace(*input.EmailRestrict)
		if trimmed != "" {
			if err := auth.ValidateEmail(trimmed); err != nil {
				return nil, err
			}
			normalized := auth.NormalizeEmail(trimmed)
			emailRestrict = &normalized
		}
	}

	var label *string
	if input.Label != nil {
		trimmed := strings.TrimSpace(*input.Label)
		if trimmed != "" {
			label = &trimmed
		}
	}

	var expiresAt *time.Time
	if input.ExpiresAt != nil && strings.TrimSpace(*input.ExpiresAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*input.ExpiresAt))
		if err != nil {
			return nil, fmt.Errorf("invalid expiresAt")
		}
		expiresAt = &parsed
	}

	id := "invite-" + uuid.NewString()[:12]
	row := pool.QueryRow(ctx, `
		INSERT INTO beta_invite_links (
			id, code, label, email_restrict, max_uses, use_count, is_active, created_by, created_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, 0, TRUE, $6, $7, $8)
		RETURNING id, code, label, email_restrict, max_uses, use_count, is_active, created_at, expires_at
	`, id, code, label, emailRestrict, input.MaxUses, actorID, now, expiresAt)

	link, err := scanInviteLink(row)
	if err != nil {
		return nil, fmt.Errorf("create invite link: %w", err)
	}

	if err := RecordAdminAudit(ctx, pool, actorID, "create_invite_link", "invite_link", link.ID, map[string]any{
		"code": link.Code,
	}); err != nil {
		return nil, err
	}
	return link, nil
}

// UpdateInviteLink updates an invite link (admin).
func UpdateInviteLink(
	ctx context.Context,
	pool *pgxpool.Pool,
	actorID string,
	input model.UpdateInviteLinkInput,
) (*model.InviteLink, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, code, label, email_restrict, max_uses, use_count, is_active, created_at, expires_at
		FROM beta_invite_links
		WHERE id = $1
	`, input.ID)
	current, err := scanInviteLink(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("invite link not found")
	}
	if err != nil {
		return nil, fmt.Errorf("load invite link: %w", err)
	}

	if input.Label != nil {
		trimmed := strings.TrimSpace(*input.Label)
		if trimmed == "" {
			current.Label = nil
		} else {
			current.Label = &trimmed
		}
	}
	if input.EmailRestrict != nil {
		trimmed := strings.TrimSpace(*input.EmailRestrict)
		if trimmed == "" {
			current.EmailRestrict = nil
		} else {
			if err := auth.ValidateEmail(trimmed); err != nil {
				return nil, err
			}
			normalized := auth.NormalizeEmail(trimmed)
			current.EmailRestrict = &normalized
		}
	}
	if input.MaxUses != nil {
		current.MaxUses = input.MaxUses
	}
	if input.IsActive != nil {
		current.IsActive = *input.IsActive
	}
	if input.ExpiresAt != nil {
		trimmed := strings.TrimSpace(*input.ExpiresAt)
		if trimmed == "" {
			current.ExpiresAt = nil
		} else {
			parsed, err := time.Parse(time.RFC3339, trimmed)
			if err != nil {
				return nil, fmt.Errorf("invalid expiresAt")
			}
			formatted := formatTime(parsed)
			current.ExpiresAt = &formatted
		}
	}

	var expiresAt *time.Time
	if current.ExpiresAt != nil && strings.TrimSpace(*current.ExpiresAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*current.ExpiresAt))
		if err != nil {
			return nil, fmt.Errorf("invalid stored expiresAt")
		}
		expiresAt = &parsed
	}

	updatedRow := pool.QueryRow(ctx, `
		UPDATE beta_invite_links
		SET label = $2, email_restrict = $3, max_uses = $4, is_active = $5, expires_at = $6
		WHERE id = $1
		RETURNING id, code, label, email_restrict, max_uses, use_count, is_active, created_at, expires_at
	`, current.ID, current.Label, current.EmailRestrict, current.MaxUses, current.IsActive, expiresAt)

	link, err := scanInviteLink(updatedRow)
	if err != nil {
		return nil, fmt.Errorf("update invite link: %w", err)
	}

	if err := RecordAdminAudit(ctx, pool, actorID, "update_invite_link", "invite_link", link.ID, map[string]any{
		"code":     link.Code,
		"isActive": link.IsActive,
	}); err != nil {
		return nil, err
	}
	return link, nil
}
