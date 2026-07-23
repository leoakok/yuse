package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/email"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type authUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type registerRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	Name            string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(pool *pgxpool.Pool, emailCfg email.Config, appOrigin string, verificationRequired bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxAuthBodyBytes)

		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		req.Email = strings.TrimSpace(req.Email)
		req.Name = strings.TrimSpace(req.Name)
		if req.Password != req.ConfirmPassword {
			writeAuthError(w, "passwords do not match", http.StatusBadRequest)
			return
		}

		scope, err := store.RegisterEmailUser(r.Context(), pool, req.Email, req.Password, req.Name)
		if err != nil {
			status := http.StatusBadRequest
			message := err.Error()
			if strings.Contains(err.Error(), "could not create account") {
				status = http.StatusConflict
				message = "could not create account"
			} else if errors.Is(err, store.ErrInviteRequired) {
				status = http.StatusForbidden
				message = "invite required"
			} else if strings.Contains(err.Error(), "waitlist") {
				status = http.StatusForbidden
				message = "your email is on the waitlist"
			}
			writeAuthError(w, message, status)
			return
		}

		user, err := store.UserByID(r.Context(), pool, scope.UserID)
		if err != nil {
			writeAuthError(w, "registration failed", http.StatusInternalServerError)
			return
		}

		if verificationRequired {
			if err := email.DeliverVerificationEmail(r.Context(), pool, emailCfg, appOrigin, user.ID, user.Email); err != nil {
				writeAuthError(w, "account created but verification email could not be sent", http.StatusInternalServerError)
				return
			}
		} else {
			_ = email.SendWelcomeEmail(emailCfg, user.Email, user.DisplayName, appOrigin)
		}

		writeAuthJSON(w, http.StatusCreated, authUserResponse{
			ID:    user.ID,
			Email: user.Email,
			Name:  user.DisplayName,
		})
	}
}

func Login(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxAuthBodyBytes)

		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		claims, err := store.AuthenticateEmailUser(r.Context(), pool, req.Email, req.Password)
		if err != nil {
			message := "invalid email or password"
			status := http.StatusUnauthorized
			if errors.Is(err, store.ErrUserDeactivated) {
				message = "account deactivated"
			}
			writeAuthError(w, message, status)
			return
		}

		writeAuthJSON(w, http.StatusOK, authUserResponse{
			ID:    claims.UserID(),
			Email: claims.Email,
			Name:  claims.Name,
		})
	}
}

type resolveGoogleRequest struct {
	GoogleID string `json:"googleId"`
}

func ResolveGoogle(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		LimitRequestBody(w, r, MaxAuthBodyBytes)

		var req resolveGoogleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		userID, err := store.ResolveGoogleIdentity(r.Context(), pool, req.GoogleID)
		if err != nil {
			writeAuthError(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeAuthJSON(w, http.StatusOK, map[string]string{"userId": userID})
	}
}

func writeAuthJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeAuthError(w http.ResponseWriter, message string, status int) {
	writeAuthJSON(w, status, map[string]string{"error": message})
}
