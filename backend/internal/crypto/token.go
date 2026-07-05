package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
)

const encryptedPrefix = "enc:v1:"

// TokenCipher encrypts and decrypts OAuth tokens at rest using AES-256-GCM.
type TokenCipher struct {
	gcm cipher.AEAD
}

// NewTokenCipherFromEnv builds a cipher from ENCRYPTION_KEY or AUTH_SECRET.
func NewTokenCipherFromEnv() (*TokenCipher, error) {
	keyMaterial := strings.TrimSpace(os.Getenv("ENCRYPTION_KEY"))
	if keyMaterial == "" {
		keyMaterial = strings.TrimSpace(os.Getenv("AUTH_SECRET"))
	}
	if keyMaterial == "" {
		return nil, errors.New("ENCRYPTION_KEY or AUTH_SECRET is required for token encryption")
	}
	sum := sha256.Sum256([]byte(keyMaterial))
	return NewTokenCipher(sum[:])
}

// NewTokenCipher creates a cipher from a 32-byte AES key.
func NewTokenCipher(key []byte) (*TokenCipher, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes, got %d", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}
	return &TokenCipher{gcm: gcm}, nil
}

// Encrypt returns a prefixed base64 ciphertext, or plaintext when input is empty.
func (c *TokenCipher) Encrypt(plaintext string) (string, error) {
	plaintext = strings.TrimSpace(plaintext)
	if plaintext == "" {
		return "", nil
	}
	if c == nil {
		return plaintext, nil
	}
	nonce := make([]byte, c.gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}
	ciphertext := c.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return encryptedPrefix + base64.RawStdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt returns plaintext. Legacy plaintext values pass through unchanged.
func (c *TokenCipher) Decrypt(stored string) (string, error) {
	stored = strings.TrimSpace(stored)
	if stored == "" {
		return "", nil
	}
	if !strings.HasPrefix(stored, encryptedPrefix) {
		return stored, nil
	}
	if c == nil {
		return "", errors.New("encrypted token present but cipher not configured")
	}
	raw, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(stored, encryptedPrefix))
	if err != nil {
		return "", fmt.Errorf("decode token: %w", err)
	}
	nonceSize := c.gcm.NonceSize()
	if len(raw) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]
	plain, err := c.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt token: %w", err)
	}
	return string(plain), nil
}

// IsEncrypted reports whether a stored value uses the encrypted prefix.
func IsEncrypted(stored string) bool {
	return strings.HasPrefix(strings.TrimSpace(stored), encryptedPrefix)
}
