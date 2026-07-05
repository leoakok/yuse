package ratelimit

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimiterAllowWithinWindow(t *testing.T) {
	now := time.Date(2026, 7, 4, 12, 0, 0, 0, time.UTC)
	limiter := New(2, time.Minute)
	limiter.now = func() time.Time { return now }

	if !limiter.Allow("ip:1") {
		t.Fatal("expected first request to be allowed")
	}
	if !limiter.Allow("ip:1") {
		t.Fatal("expected second request to be allowed")
	}
	if limiter.Allow("ip:1") {
		t.Fatal("expected third request to be blocked")
	}
	if limiter.RetryAfter("ip:1") < 1 {
		t.Fatal("expected positive retry-after")
	}
}

func TestLimiterResetsAfterWindow(t *testing.T) {
	now := time.Date(2026, 7, 4, 12, 0, 0, 0, time.UTC)
	limiter := New(1, time.Minute)
	limiter.now = func() time.Time { return now }

	if !limiter.Allow("ip:2") {
		t.Fatal("expected first request to be allowed")
	}
	if limiter.Allow("ip:2") {
		t.Fatal("expected second request to be blocked")
	}

	now = now.Add(2 * time.Minute)
	if !limiter.Allow("ip:2") {
		t.Fatal("expected request after window to be allowed")
	}
}

func TestLimiterMiddleware(t *testing.T) {
	limiter := New(1, time.Minute)
	handler := limiter.Middleware(func(r *http.Request) string {
		return "test"
	})(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec2.Code)
	}
}
