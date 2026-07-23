package ratelimit

import "time"

// Backend abstracts a distributed rate limit store. The default in-memory Limiter
// is used today; swap in a Redis or Upstash implementation for multi-instance deploys.
type Backend interface {
	Allow(key string, limit int, window time.Duration) (allowed bool, retryAfter time.Duration)
}

// InMemoryBackend is the default process-local implementation backing Limiter.
type InMemoryBackend struct {
	inner *Limiter
}

func NewInMemoryBackend(limit int, window time.Duration) *InMemoryBackend {
	return &InMemoryBackend{inner: New(limit, window)}
}

func (b *InMemoryBackend) Allow(key string, limit int, window time.Duration) (bool, time.Duration) {
	if b.inner == nil {
		b.inner = New(limit, window)
	}
	if b.inner.Allow(key) {
		return true, 0
	}
	return false, time.Duration(b.inner.RetryAfter(key)) * time.Second
}
