package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type oauthStatePayload struct {
	UserID   string `json:"uid"`
	Provider string `json:"p"`
	Nonce    string `json:"n"`
	Exp      int64  `json:"exp"`
}

// SignOAuthState returns a CSRF-safe state token binding the OAuth flow to a user.
func SignOAuthState(secret, userID, provider string, ttl time.Duration) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", fmt.Errorf("auth secret is required")
	}
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("user id is required")
	}
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	payload := oauthStatePayload{
		UserID:   userID,
		Provider: provider,
		Nonce:    base64.RawURLEncoding.EncodeToString(nonce),
		Exp:      time.Now().UTC().Add(ttl).Unix(),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(raw)
	sig := signOAuthPayload(secret, encoded)
	return encoded + "." + sig, nil
}

// VerifyOAuthState validates the state token and returns the bound user id and provider.
func VerifyOAuthState(secret, state string) (userID, provider string, err error) {
	parts := strings.Split(state, ".")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid oauth state")
	}
	expected := signOAuthPayload(secret, parts[0])
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return "", "", fmt.Errorf("invalid oauth state signature")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", "", fmt.Errorf("invalid oauth state payload")
	}
	var payload oauthStatePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return "", "", fmt.Errorf("invalid oauth state payload")
	}
	if time.Now().UTC().Unix() > payload.Exp {
		return "", "", fmt.Errorf("oauth state expired")
	}
	if strings.TrimSpace(payload.UserID) == "" || strings.TrimSpace(payload.Provider) == "" {
		return "", "", fmt.Errorf("invalid oauth state payload")
	}
	return payload.UserID, payload.Provider, nil
}

func signOAuthPayload(secret, encoded string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(encoded))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
