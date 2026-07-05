package httpapi_test

import (
	"net/http/httptest"
	"os"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/httpapi"
	"github.com/leo/ai-weekend/backend/internal/scope"
)

func TestClientIPIgnoresSpoofedForwardedForByDefault(t *testing.T) {
	t.Setenv("TRUSTED_PROXY", "")
	t.Setenv("TRUSTED_PROXY_CIDRS", "")
	scope.ResetTrustedProxyConfig()

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.99")

	if got := httpapi.ClientIP(req); got != "203.0.113.10" {
		t.Fatalf("ClientIP = %q, want %q", got, "203.0.113.10")
	}
}

func TestClientIPTrustsForwardedForWhenTrustedProxyEnabled(t *testing.T) {
	t.Setenv("TRUSTED_PROXY", "true")
	t.Setenv("TRUSTED_PROXY_CIDRS", "")
	scope.ResetTrustedProxyConfig()

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.99, 203.0.113.10")

	if got := httpapi.ClientIP(req); got != "198.51.100.99" {
		t.Fatalf("ClientIP = %q, want %q", got, "198.51.100.99")
	}
}

func TestClientIPTrustsForwardedForFromTrustedCIDR(t *testing.T) {
	t.Setenv("TRUSTED_PROXY", "")
	t.Setenv("TRUSTED_PROXY_CIDRS", "10.0.0.0/8")
	scope.ResetTrustedProxyConfig()

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.1.2.3:443"
	req.Header.Set("X-Real-IP", "198.51.100.55")

	if got := httpapi.ClientIP(req); got != "198.51.100.55" {
		t.Fatalf("ClientIP = %q, want %q", got, "198.51.100.55")
	}
}

func TestClientIPIgnoresForwardedForFromUntrustedPeer(t *testing.T) {
	t.Setenv("TRUSTED_PROXY", "")
	t.Setenv("TRUSTED_PROXY_CIDRS", "10.0.0.0/8")
	scope.ResetTrustedProxyConfig()

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.99")

	if got := httpapi.ClientIP(req); got != "203.0.113.10" {
		t.Fatalf("ClientIP = %q, want %q", got, "203.0.113.10")
	}
}

func TestMain(m *testing.M) {
	code := m.Run()
	os.Unsetenv("TRUSTED_PROXY")
	os.Unsetenv("TRUSTED_PROXY_CIDRS")
	scope.ResetTrustedProxyConfig()
	os.Exit(code)
}
