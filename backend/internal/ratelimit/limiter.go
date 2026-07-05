package ratelimit

import (
	"net/http"
	"sync"
	"time"
)

// Limiter enforces a maximum number of events per window for each key.
type Limiter struct {
	mu       sync.Mutex
	limit    int
	window   time.Duration
	entries  map[string]*bucket
	now      func() time.Time
}

type bucket struct {
	count   int
	resetAt time.Time
}

// New creates a limiter allowing limit events per window duration.
func New(limit int, window time.Duration) *Limiter {
	if limit < 1 {
		limit = 1
	}
	if window <= 0 {
		window = time.Minute
	}
	return &Limiter{
		limit:   limit,
		window:  window,
		entries: make(map[string]*bucket),
		now:     time.Now,
	}
}

// Allow reports whether key may proceed and records the attempt when allowed.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	entry, ok := l.entries[key]
	if !ok || now.After(entry.resetAt) {
		l.entries[key] = &bucket{count: 1, resetAt: now.Add(l.window)}
		return true
	}
	if entry.count >= l.limit {
		return false
	}
	entry.count++
	return true
}

// RetryAfter returns seconds until the key may retry, or zero when allowed now.
func (l *Limiter) RetryAfter(key string) int {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	entry, ok := l.entries[key]
	if !ok || now.After(entry.resetAt) || entry.count < l.limit {
		return 0
	}
	remaining := int(entry.resetAt.Sub(now).Seconds())
	if remaining < 1 {
		return 1
	}
	return remaining
}

// Middleware wraps a handler with per-key rate limiting.
func (l *Limiter) Middleware(keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFn(r)
			if key == "" {
				next.ServeHTTP(w, r)
				return
			}
			if l.Allow(key) {
				next.ServeHTTP(w, r)
				return
			}
			retry := l.RetryAfter(key)
			if retry > 0 {
				w.Header().Set("Retry-After", formatRetryAfter(retry))
			}
			http.Error(w, "too many requests", http.StatusTooManyRequests)
		})
	}
}

func formatRetryAfter(seconds int) string {
	if seconds < 1 {
		return "1"
	}
	return itoa(seconds)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
