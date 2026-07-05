package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// VerifyEmail confirms an email address from a verification link token.
func VerifyEmail(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		token := strings.TrimSpace(r.URL.Query().Get("token"))
		if token == "" {
			writeAuthError(w, "missing verification token", http.StatusBadRequest)
			return
		}

		err := store.VerifyEmailByToken(r.Context(), pool, token)
		if errors.Is(err, store.ErrVerificationTokenInvalid) {
			writeAuthError(w, "verification link is invalid or expired", http.StatusBadRequest)
			return
		}
		if err != nil {
			writeAuthError(w, "could not verify email", http.StatusInternalServerError)
			return
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{
			"message": "Email verified. You can return to Yuse.",
		})
	}
}
