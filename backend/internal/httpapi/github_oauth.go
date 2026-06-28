package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/store"
)

const githubOAuthScopes = "read:user,repo"

type GitHubOAuthHandlers struct {
	Pool   *pgxpool.Pool
	Config config.Config
}

func (h GitHubOAuthHandlers) Start() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if !h.Config.HasGitHubOAuth() {
			writeAuthError(w, "GitHub OAuth is not configured", http.StatusServiceUnavailable)
			return
		}

		claims, err := auth.ParseBearer(r.Header.Get("Authorization"), h.Config.AuthSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		state, err := auth.SignOAuthState(h.Config.AuthSecret, claims.UserID(), store.ProviderGitHub, 15*time.Minute)
		if err != nil {
			writeAuthError(w, "could not start GitHub OAuth", http.StatusInternalServerError)
			return
		}

		params := url.Values{}
		params.Set("client_id", h.Config.GitHubClientID)
		params.Set("redirect_uri", h.Config.GitHubOAuthCallbackURL)
		params.Set("scope", githubOAuthScopes)
		params.Set("state", state)

		authorizeURL := "https://github.com/login/oauth/authorize?" + params.Encode()
		http.Redirect(w, r, authorizeURL, http.StatusFound)
	}
}

func (h GitHubOAuthHandlers) Callback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if !h.Config.HasGitHubOAuth() {
			redirectWithError(w, r, h.Config.CORSOrigin, "GitHub OAuth is not configured")
			return
		}

		code := strings.TrimSpace(r.URL.Query().Get("code"))
		state := strings.TrimSpace(r.URL.Query().Get("state"))
		if errMsg := strings.TrimSpace(r.URL.Query().Get("error")); errMsg != "" {
			redirectWithError(w, r, h.Config.CORSOrigin, "GitHub authorization was cancelled")
			return
		}
		if code == "" || state == "" {
			redirectWithError(w, r, h.Config.CORSOrigin, "Missing authorization code")
			return
		}

		userID, provider, err := auth.VerifyOAuthState(h.Config.AuthSecret, state)
		if err != nil || provider != store.ProviderGitHub {
			redirectWithError(w, r, h.Config.CORSOrigin, "Invalid or expired OAuth state")
			return
		}

		tokenResp, err := exchangeGitHubCode(r.Context(), h.Config, code)
		if err != nil {
			redirectWithError(w, r, h.Config.CORSOrigin, "Could not complete GitHub sign-in")
			return
		}

		userAPI, err := fetchGitHubUser(r.Context(), tokenResp.AccessToken)
		if err != nil {
			redirectWithError(w, r, h.Config.CORSOrigin, "Could not read GitHub profile")
			return
		}

		metadata := store.GitHubMetadataFromUserAPI(userAPI)
		_, err = store.UpsertUserConnection(
			r.Context(),
			h.Pool,
			userID,
			store.ProviderGitHub,
			tokenResp.AccessToken,
			tokenResp.RefreshToken,
			tokenResp.ExpiresAt,
			metadata,
		)
		if err != nil {
			redirectWithError(w, r, h.Config.CORSOrigin, "Could not save GitHub connection")
			return
		}

		redirectURL := strings.TrimRight(h.Config.CORSOrigin, "/") + "/connections?connected=github"
		http.Redirect(w, r, redirectURL, http.StatusFound)
	}
}

type githubTokenResponse struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    *time.Time
}

func exchangeGitHubCode(ctx context.Context, cfg config.Config, code string) (githubTokenResponse, error) {
	form := url.Values{}
	form.Set("client_id", cfg.GitHubClientID)
	form.Set("client_secret", cfg.GitHubClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", cfg.GitHubOAuthCallbackURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
	if err != nil {
		return githubTokenResponse{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return githubTokenResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return githubTokenResponse{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return githubTokenResponse{}, fmt.Errorf("github token exchange HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return githubTokenResponse{}, err
	}
	if parsed.Error != "" {
		msg := parsed.Error
		if parsed.ErrorDesc != "" {
			msg = parsed.ErrorDesc
		}
		return githubTokenResponse{}, fmt.Errorf("github token error: %s", msg)
	}
	if strings.TrimSpace(parsed.AccessToken) == "" {
		return githubTokenResponse{}, fmt.Errorf("github token missing access_token")
	}

	out := githubTokenResponse{AccessToken: parsed.AccessToken, RefreshToken: parsed.RefreshToken}
	if parsed.ExpiresIn > 0 {
		exp := time.Now().UTC().Add(time.Duration(parsed.ExpiresIn) * time.Second)
		out.ExpiresAt = &exp
	}
	return out, nil
}

func fetchGitHubUser(ctx context.Context, accessToken string) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Yuse-CV-Assistant/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("github user API HTTP %d: %s", resp.StatusCode, string(body))
	}
	var user map[string]any
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}
	return user, nil
}

func redirectWithError(w http.ResponseWriter, r *http.Request, origin, message string) {
	target := strings.TrimRight(origin, "/") + "/connections?error=" + url.QueryEscape(message)
	http.Redirect(w, r, target, http.StatusFound)
}
