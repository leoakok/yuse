package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/store"
)

const MaxWaitlistBodyBytes = 4 * 1024

type waitlistRequest struct {
	Email string `json:"email"`
}

type accessCheckRequest struct {
	Email string `json:"email"`
}

type accessCheckResponse struct {
	Status string `json:"status"`
}

func JoinWaitlist(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxWaitlistBodyBytes)

		var req waitlistRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		email := strings.TrimSpace(req.Email)
		if err := auth.ValidateEmail(email); err != nil {
			writeAuthError(w, "enter a valid email address", http.StatusBadRequest)
			return
		}

		if err := store.JoinWaitlist(r.Context(), pool, email); err != nil {
			writeAuthError(w, "could not join waitlist", http.StatusInternalServerError)
			return
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{
			"message": "Thanks, we will email you when you are in.",
		})
	}
}

func CheckAccess(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxWaitlistBodyBytes)

		var req accessCheckRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		email := strings.TrimSpace(req.Email)
		if err := auth.ValidateEmail(email); err != nil {
			writeAuthError(w, "enter a valid email address", http.StatusBadRequest)
			return
		}

		status, err := store.PublicAccessCheckStatus(r.Context(), pool, email)
		if err != nil {
			writeAuthError(w, "could not check access", http.StatusInternalServerError)
			return
		}

		writeAuthJSON(w, http.StatusOK, accessCheckResponse{Status: string(status)})
	}
}
