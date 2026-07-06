package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type claimInviteRequest struct {
	Code  string `json:"code"`
	Email string `json:"email"`
}

type publicInviteResponse struct {
	Code          string  `json:"code"`
	Label         *string `json:"label,omitempty"`
	EmailRestrict *string `json:"emailRestrict,omitempty"`
	RemainingUses *int    `json:"remainingUses,omitempty"`
	Expired       bool    `json:"expired"`
}

func PublicInvite(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		code := strings.TrimSpace(r.PathValue("code"))
		if code == "" {
			writeAuthError(w, "invite not found", http.StatusNotFound)
			return
		}

		preview, err := store.PublicInvitePreviewByCode(r.Context(), pool, code)
		if errors.Is(err, store.ErrInviteNotFound) {
			writeAuthError(w, "invite not found", http.StatusNotFound)
			return
		}
		if err != nil {
			writeAuthError(w, "could not load invite", http.StatusInternalServerError)
			return
		}

		writeAuthJSON(w, http.StatusOK, publicInviteResponse{
			Code:          preview.Code,
			Label:         preview.Label,
			EmailRestrict: preview.EmailRestrict,
			RemainingUses: preview.RemainingUses,
			Expired:       preview.Expired,
		})
	}
}

func ClaimInvite(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxWaitlistBodyBytes)

		var req claimInviteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		code := strings.TrimSpace(req.Code)
		email := strings.TrimSpace(req.Email)
		if code == "" {
			writeAuthError(w, "invite code is required", http.StatusBadRequest)
			return
		}
		if err := auth.ValidateEmail(email); err != nil {
			writeAuthError(w, "enter a valid email address", http.StatusBadRequest)
			return
		}

		err := store.ClaimInviteLink(r.Context(), pool, code, email)
		if errors.Is(err, store.ErrInviteNotFound) {
			writeAuthError(w, "invite not found", http.StatusNotFound)
			return
		}
		if errors.Is(err, store.ErrInviteInactive) || errors.Is(err, store.ErrInviteExpired) {
			writeAuthError(w, "this invite is no longer active", http.StatusGone)
			return
		}
		if errors.Is(err, store.ErrInviteExhausted) {
			writeAuthError(w, "this invite has reached its usage limit", http.StatusGone)
			return
		}
		if errors.Is(err, store.ErrInviteEmailMatch) {
			writeAuthError(w, "this invite is for a different email address", http.StatusForbidden)
			return
		}
		if errors.Is(err, store.ErrInviteRedeemed) {
			writeAuthError(w, "this email already claimed this invite", http.StatusConflict)
			return
		}
		if err != nil {
			writeAuthError(w, "could not claim invite", http.StatusInternalServerError)
			return
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{
			"message": "Invite claimed. You can sign up now.",
			"status":  "approved",
		})
	}
}
