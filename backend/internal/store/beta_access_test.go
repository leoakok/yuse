package store

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestSignupAccessStatusBetaGate(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	t.Setenv("BETA_INVITE_ONLY", "true")
	email := "beta-test-" + t.Name() + "@example.com"

	status, err := SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus: %v", err)
	}
	if status != AccessDenied {
		t.Fatalf("expected denied, got %s", status)
	}

	if err := JoinWaitlist(ctx, pool, email); err != nil {
		t.Fatalf("JoinWaitlist: %v", err)
	}

	status, err = SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus pending: %v", err)
	}
	if status != AccessPending {
		t.Fatalf("expected pending, got %s", status)
	}

	_, err = pool.Exec(ctx, `
		UPDATE beta_waitlist SET status = 'approved' WHERE LOWER(email) = LOWER($1)
	`, email)
	if err != nil {
		t.Fatalf("approve waitlist: %v", err)
	}

	status, err = SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus approved: %v", err)
	}
	if status != AccessApproved {
		t.Fatalf("expected approved, got %s", status)
	}

	_, _ = pool.Exec(ctx, `DELETE FROM beta_waitlist WHERE LOWER(email) = LOWER($1)`, email)
}

func TestBetaInviteOnlyDisabledAllowsSignup(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	t.Setenv("BETA_INVITE_ONLY", "false")
	email := "beta-open-" + t.Name() + "@example.com"

	status, err := SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus: %v", err)
	}
	if status != AccessApproved {
		t.Fatalf("expected approved when beta off, got %s", status)
	}
}

func TestPublicAccessCheckStatusHidesNonWaitlistProbes(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	t.Setenv("BETA_INVITE_ONLY", "true")
	email := "probe-test-" + t.Name() + "@example.com"
	rejectedEmail := "probe-rejected-" + t.Name() + "@example.com"

	status, err := PublicAccessCheckStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("PublicAccessCheckStatus unknown: %v", err)
	}
	if status != AccessDenied {
		t.Fatalf("expected denied for unknown email, got %s", status)
	}

	if err := JoinWaitlist(ctx, pool, rejectedEmail); err != nil {
		t.Fatalf("JoinWaitlist: %v", err)
	}
	_, err = pool.Exec(ctx, `
		UPDATE beta_waitlist SET status = 'rejected' WHERE LOWER(email) = LOWER($1)
	`, rejectedEmail)
	if err != nil {
		t.Fatalf("reject waitlist: %v", err)
	}

	status, err = PublicAccessCheckStatus(ctx, pool, rejectedEmail)
	if err != nil {
		t.Fatalf("PublicAccessCheckStatus rejected: %v", err)
	}
	if status != AccessDenied {
		t.Fatalf("expected denied for rejected waitlist email, got %s", status)
	}

	waitlistEmail := "probe-pending-" + t.Name() + "@example.com"
	if err := JoinWaitlist(ctx, pool, waitlistEmail); err != nil {
		t.Fatalf("JoinWaitlist pending: %v", err)
	}
	status, err = PublicAccessCheckStatus(ctx, pool, waitlistEmail)
	if err != nil {
		t.Fatalf("PublicAccessCheckStatus pending: %v", err)
	}
	if status != AccessPending {
		t.Fatalf("expected pending for waitlist email, got %s", status)
	}

	_, _ = pool.Exec(ctx, `DELETE FROM beta_waitlist WHERE LOWER(email) LIKE 'probe-%'`)
}
