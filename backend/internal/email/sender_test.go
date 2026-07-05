package email

import (
	"testing"
)

func TestLoadConfigPrefersResendAPIKey(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test_key")
	t.Setenv("EMAIL_API_KEY", "legacy_key")
	t.Setenv("EMAIL_PROVIDER", "resend")
	t.Setenv("EMAIL_FROM", "Yuse <hello@yuse.one>")

	cfg := LoadConfig()
	if cfg.APIKey != "re_test_key" {
		t.Fatalf("APIKey = %q, want re_test_key", cfg.APIKey)
	}
	if !cfg.IsConfigured() {
		t.Fatal("expected configured resend transport")
	}
}

func TestIsConfiguredFalseWithoutProvider(t *testing.T) {
	t.Setenv("EMAIL_PROVIDER", "")
	t.Setenv("EMAIL_FROM", "hello@yuse.one")
	t.Setenv("RESEND_API_KEY", "re_test_key")

	cfg := LoadConfig()
	if cfg.IsConfigured() {
		t.Fatal("expected unconfigured without provider")
	}
}

func TestSendWaitlistApprovalSkipsWhenUnconfigured(t *testing.T) {
	cfg := Config{}
	if err := SendWaitlistApprovalEmail(cfg, "user@example.com", "https://yuse.one/login"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSendVerificationSkipsWhenUnconfigured(t *testing.T) {
	cfg := Config{}
	if err := SendVerificationEmail(cfg, "user@example.com", "https://yuse.one/verify-email?token=abc"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
