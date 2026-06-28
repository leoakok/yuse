package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
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

func Register(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

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
			if strings.Contains(err.Error(), "already registered") {
				status = http.StatusConflict
			}
			writeAuthError(w, err.Error(), status)
			return
		}

		user, err := store.UserByID(r.Context(), pool, scope.UserID)
		if err != nil {
			writeAuthError(w, "registration failed", http.StatusInternalServerError)
			return
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

		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAuthError(w, "invalid json", http.StatusBadRequest)
			return
		}

		claims, err := store.AuthenticateEmailUser(r.Context(), pool, req.Email, req.Password)
		if err != nil {
			writeAuthError(w, "invalid email or password", http.StatusUnauthorized)
			return
		}

		writeAuthJSON(w, http.StatusOK, authUserResponse{
			ID:    claims.UserID(),
			Email: claims.Email,
			Name:  claims.Name,
		})
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
