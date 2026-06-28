package auth

import "testing"

func TestValidateEmail(t *testing.T) {
	if err := ValidateEmail(""); err == nil {
		t.Fatal("expected empty email error")
	}
	if err := ValidateEmail("not-an-email"); err == nil {
		t.Fatal("expected invalid email error")
	}
	if err := ValidateEmail("User@Example.com"); err != nil {
		t.Fatalf("valid email rejected: %v", err)
	}
}

func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("short"); err == nil {
		t.Fatal("expected short password error")
	}
	if err := ValidatePassword("long-enough"); err != nil {
		t.Fatalf("valid password rejected: %v", err)
	}
}

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("secure-password")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !VerifyPassword(hash, "secure-password") {
		t.Fatal("expected password to verify")
	}
	if VerifyPassword(hash, "wrong-password") {
		t.Fatal("expected wrong password to fail")
	}
}

func TestWorkspaceIDForUser(t *testing.T) {
	if got := WorkspaceIDForUser("google-abc"); got != "ws-abc" {
		t.Fatalf("google workspace = %q", got)
	}
	if got := WorkspaceIDForUser("email-abc"); got != "ws-abc" {
		t.Fatalf("email workspace = %q", got)
	}
}

func TestClaimsValidateEmailUser(t *testing.T) {
	claims := Claims{
		Sub:   "email-123",
		Email: "user@example.com",
		Name:  "User",
	}
	if err := claims.Validate(); err != nil {
		t.Fatalf("Validate: %v", err)
	}
}
