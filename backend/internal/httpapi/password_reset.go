package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/email"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token           string `json:"token"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
}

func ForgotPassword(pool *pgxpool.Pool, emailCfg email.Config, appOrigin string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxAuthBodyBytes)

		var req forgotPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		token, err := store.IssuePasswordResetToken(r.Context(), pool, req.Email)
		if err != nil {
			writeAuthError(w, "could not process request", http.StatusInternalServerError)
			return
		}
		if token != "" {
			resetURL := strings.TrimRight(appOrigin, "/") + "/reset-password?token=" + url.QueryEscape(token)
			_ = email.SendPasswordResetEmail(emailCfg, auth.NormalizeEmail(req.Email), resetURL)
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{
			"message": "If an account exists for that email, a reset link has been sent.",
		})
	}
}

func ResetPassword(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxAuthBodyBytes)

		var req resetPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.Password != req.ConfirmPassword {
			writeAuthError(w, "passwords do not match", http.StatusBadRequest)
			return
		}

		err := store.ResetPasswordByToken(r.Context(), pool, req.Token, req.Password)
		if err != nil {
			if errors.Is(err, store.ErrPasswordResetTokenInvalid) {
				writeAuthError(w, "invalid or expired reset link", http.StatusBadRequest)
				return
			}
			writeAuthError(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{"message": "password updated"})
	}
}
