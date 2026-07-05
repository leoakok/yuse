package crypto

import (
	"testing"
)

func TestTokenEncryptRoundTrip(t *testing.T) {
	cipher, err := NewTokenCipher(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	encrypted, err := cipher.Encrypt("gho_secret_token")
	if err != nil {
		t.Fatal(err)
	}
	if !IsEncrypted(encrypted) {
		t.Fatal("expected encrypted prefix")
	}
	plain, err := cipher.Decrypt(encrypted)
	if err != nil {
		t.Fatal(err)
	}
	if plain != "gho_secret_token" {
		t.Fatalf("got %q", plain)
	}
}

func TestDecryptLegacyPlaintext(t *testing.T) {
	cipher, err := NewTokenCipher(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	plain, err := cipher.Decrypt("legacy-plain-token")
	if err != nil {
		t.Fatal(err)
	}
	if plain != "legacy-plain-token" {
		t.Fatalf("got %q", plain)
	}
}
