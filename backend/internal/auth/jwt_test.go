package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestParseBearer(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwtClaims{
		Email:    "leo@example.com",
		Name:     "Leo",
		Picture:  "https://example.com/avatar.png",
		GoogleID: "12345",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "google-12345",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	claims, err := ParseBearer("Bearer "+signed, secret)
	if err != nil {
		t.Fatalf("ParseBearer: %v", err)
	}
	if claims.UserID() != "google-12345" {
		t.Fatalf("user id = %q", claims.UserID())
	}
	if claims.Email != "leo@example.com" {
		t.Fatalf("email = %q", claims.Email)
	}
}

func TestParseBearerBootstrap(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwtClaims{
		Email:     "leo@example.com",
		Name:      "Leo",
		Bootstrap: "1",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "google-12345",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	claims, err := ParseBearer("Bearer "+signed, secret)
	if err != nil {
		t.Fatalf("ParseBearer: %v", err)
	}
	if !claims.Bootstrap {
		t.Fatal("expected bootstrap claim")
	}
}

func TestParseBearerEmailUser(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwtClaims{
		Email:   "user@example.com",
		Name:    "Email User",
		Picture: "",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "email-abc123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	claims, err := ParseBearer("Bearer "+signed, secret)
	if err != nil {
		t.Fatalf("ParseBearer: %v", err)
	}
	if claims.UserID() != "email-abc123" {
		t.Fatalf("user id = %q", claims.UserID())
	}
}
