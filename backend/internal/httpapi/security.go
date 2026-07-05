package httpapi

import (
	"net/http"

	"github.com/leo/ai-weekend/backend/internal/scope"
)

const (
	MaxAuthBodyBytes      = 16 << 10 // 16 KiB
	MaxGraphQLBodyBytes   = 2 << 20  // 2 MiB
	MaxAssistantBodyBytes = 14 << 20 // 14 MiB (attachments)
)

// ClientIP returns the client IP for rate limiting.
// X-Forwarded-For and X-Real-IP are trusted only when TRUSTED_PROXY=true or
// RemoteAddr falls within TRUSTED_PROXY_CIDRS; otherwise RemoteAddr is used.
func ClientIP(r *http.Request) string {
	return scope.ClientIPFromRequest(r)
}

func LimitRequestBody(w http.ResponseWriter, r *http.Request, maxBytes int64) {
	if maxBytes <= 0 {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
}
