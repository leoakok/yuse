package auth

import (
	"testing"
	"time"
)

func TestOAuthStateRoundTrip(t *testing.T) {
	secret := "test-secret-for-oauth-state"
	state, err := SignOAuthState(secret, "user-123", "github", 5*time.Minute)
	if err != nil {
		t.Fatalf("SignOAuthState: %v", err)
	}
	userID, provider, err := VerifyOAuthState(secret, state)
	if err != nil {
		t.Fatalf("VerifyOAuthState: %v", err)
	}
	if userID != "user-123" || provider != "github" {
		t.Fatalf("got userID=%q provider=%q", userID, provider)
	}
}

func TestOAuthStateRejectsTamper(t *testing.T) {
	secret := "test-secret"
	state, err := SignOAuthState(secret, "user-123", "github", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = VerifyOAuthState("wrong-secret", state)
	if err == nil {
		t.Fatal("expected error for wrong secret")
	}
}
