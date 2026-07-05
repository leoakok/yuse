package email

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// DeliverVerificationEmail issues a token and sends a verification link to the user.
func DeliverVerificationEmail(
	ctx context.Context,
	pool *pgxpool.Pool,
	cfg Config,
	appOrigin, userID, to string,
) error {
	token, err := store.IssueEmailVerificationToken(ctx, pool, userID)
	if err != nil {
		return err
	}
	verifyURL := strings.TrimRight(appOrigin, "/") + "/verify-email?token=" + url.QueryEscape(token)
	if err := SendVerificationEmail(cfg, to, verifyURL); err != nil {
		return fmt.Errorf("send verification email: %w", err)
	}
	return nil
}
