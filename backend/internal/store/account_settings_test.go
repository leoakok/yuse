package store_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func TestChangePasswordCredentialsUser(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	email := "pw-change-" + time.Now().Format("150405") + "@example.com"
	password := "initial-password"
	scope, err := store.RegisterEmailUser(ctx, pool, email, password, "PW Test")
	if err != nil {
		t.Fatalf("RegisterEmailUser: %v", err)
	}

	if err := store.ChangePassword(ctx, pool, scope.UserID, password, "new-password-1"); err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}

	_, err = store.AuthenticateEmailUser(ctx, pool, email, "new-password-1")
	if err != nil {
		t.Fatalf("AuthenticateEmailUser with new password: %v", err)
	}
}

func TestChangePasswordWrongCurrent(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	email := "pw-wrong-" + time.Now().Format("150405") + "@example.com"
	password := "initial-password"
	scope, err := store.RegisterEmailUser(ctx, pool, email, password, "PW Test")
	if err != nil {
		t.Fatalf("RegisterEmailUser: %v", err)
	}

	err = store.ChangePassword(ctx, pool, scope.UserID, "wrong-password", "new-password-1")
	if !errors.Is(err, store.ErrIncorrectPassword) {
		t.Fatalf("expected ErrIncorrectPassword, got %v", err)
	}
}

func TestChangePasswordGoogleUserWithoutPasswordRejected(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	userID := "google-pw-test-" + uuid.NewString()[:8]
	email := userID + "@example.com"
	claims := auth.Claims{
		Sub:       userID,
		Email:     email,
		Name:      "Google PW",
		GoogleID:  userID + "-gid",
		Bootstrap: true,
	}
	if _, err := store.EnsureSession(ctx, pool, claims); err != nil {
		t.Fatalf("EnsureSession: %v", err)
	}

	err := store.ChangePassword(ctx, pool, userID, "any", "new-password-1")
	if !errors.Is(err, store.ErrPasswordManagedExternally) {
		t.Fatalf("expected ErrPasswordManagedExternally, got %v", err)
	}
}

func TestSetPasswordAndAuthenticateGoogleUser(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	userID := "google-setpw-" + uuid.NewString()[:8]
	email := userID + "@example.com"
	claims := auth.Claims{
		Sub:       userID,
		Email:     email,
		Name:      "Google Set PW",
		GoogleID:  userID + "-gid",
		Bootstrap: true,
	}
	if _, err := store.EnsureSession(ctx, pool, claims); err != nil {
		t.Fatalf("EnsureSession: %v", err)
	}

	if err := store.SetPassword(ctx, pool, userID, "local-password-1"); err != nil {
		t.Fatalf("SetPassword: %v", err)
	}

	_, err := store.AuthenticateEmailUser(ctx, pool, email, "local-password-1")
	if err != nil {
		t.Fatalf("AuthenticateEmailUser: %v", err)
	}
}

func TestResolveGoogleReturnsDerivedUserIDWhenNotLinked(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	googleID := "gid-" + uuid.NewString()[:8]
	resolved, err := store.ResolveGoogleIdentity(ctx, pool, googleID)
	if err != nil {
		t.Fatalf("ResolveGoogleIdentity: %v", err)
	}
	want := auth.UserIDFromGoogleSub(googleID)
	if resolved != want {
		t.Fatalf("resolved = %q, want %q", resolved, want)
	}
}

func TestResolveGoogleReturnsLinkedAccount(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	email := "link-google-" + time.Now().Format("150405") + "@example.com"
	scope, err := store.RegisterEmailUser(ctx, pool, email, "initial-password", "Link Google")
	if err != nil {
		t.Fatalf("RegisterEmailUser: %v", err)
	}

	googleID := "gid-" + uuid.NewString()[:8]
	now := time.Now().UTC()
	if _, err := pool.Exec(ctx, `UPDATE users SET google_id = $2, updated_at = $3 WHERE id = $1`, scope.UserID, googleID, now); err != nil {
		t.Fatalf("link google fixture: %v", err)
	}

	resolved, err := store.ResolveGoogleIdentity(ctx, pool, googleID)
	if err != nil {
		t.Fatalf("ResolveGoogleIdentity: %v", err)
	}
	if resolved != scope.UserID {
		t.Fatalf("resolved = %q, want %q", resolved, scope.UserID)
	}

	hasGoogle, err := store.UserHasGoogleCredential(ctx, pool, scope.UserID)
	if err != nil {
		t.Fatalf("UserHasGoogleCredential: %v", err)
	}
	if !hasGoogle {
		t.Fatal("expected google linked")
	}
}

func TestChangeEmailCredentialsUser(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	email := "email-change-" + time.Now().Format("150405") + "@example.com"
	scope, err := store.RegisterEmailUser(ctx, pool, email, "initial-password", "Email Test")
	if err != nil {
		t.Fatalf("RegisterEmailUser: %v", err)
	}

	nextEmail := "updated-" + email
	updated, err := store.ChangeEmail(ctx, pool, scope.UserID, "initial-password", nextEmail, false)
	if err != nil {
		t.Fatalf("ChangeEmail: %v", err)
	}
	if updated.Email != auth.NormalizeEmail(nextEmail) {
		t.Fatalf("email = %q, want %q", updated.Email, auth.NormalizeEmail(nextEmail))
	}
}

func TestChangeEmailWrongPassword(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()

	ctx := context.Background()
	email := "email-wrong-pw-" + time.Now().Format("150405") + "@example.com"
	scope, err := store.RegisterEmailUser(ctx, pool, email, "initial-password", "Email Test")
	if err != nil {
		t.Fatalf("RegisterEmailUser: %v", err)
	}

	_, err = store.ChangeEmail(ctx, pool, scope.UserID, "wrong-password", "updated-"+email, false)
	if !errors.Is(err, store.ErrIncorrectPassword) {
		t.Fatalf("expected ErrIncorrectPassword, got %v", err)
	}
}
