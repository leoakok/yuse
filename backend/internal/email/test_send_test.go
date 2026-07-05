package email

import (
	"strings"
	"testing"
)

func TestSendTestEmailUnknownType(t *testing.T) {
	cfg := Config{Provider: "resend", From: "hello@yuse.one", APIKey: "re_test"}
	err := SendTestEmail(cfg, "UNKNOWN", "user@example.com", "https://yuse.one")
	if err == nil || !strings.Contains(err.Error(), "unknown test email type") {
		t.Fatalf("expected unknown type error, got %v", err)
	}
}

func TestSendTestEmailRequiresConfiguredProvider(t *testing.T) {
	err := SendTestEmail(Config{}, "WELCOME", "user@example.com", "https://yuse.one")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected not configured error, got %v", err)
	}
}

func TestSendTestEmailBuildsVerificationURL(t *testing.T) {
	cfg := Config{}
	// Exercise URL construction without sending.
	err := sendTestVerification(cfg, "user@example.com", "https://yuse.one/verify-email?token="+testPreviewToken)
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected not configured from sendRequired, got %v", err)
	}
}
