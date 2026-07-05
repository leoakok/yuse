package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type publicContentResponse struct {
	Kind      string                     `json:"kind"`
	Portfolio *model.PortfolioWithContent `json:"portfolio,omitempty"`
	Resume    *model.ResumeWithContent    `json:"resume,omitempty"`
}

// PublicContent serves portfolio or resume JSON for public pages without authentication.
func PublicContent(pg *store.Postgres) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		username := strings.TrimSpace(r.PathValue("username"))
		if username == "" {
			http.NotFound(w, r)
			return
		}

		var slug *string
		if s := strings.TrimSpace(r.PathValue("slug")); s != "" {
			slug = &s
		}

		portfolio, err := pg.PublicPortfolioWithContent(username, slug)
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
		if portfolio != nil {
			writePublicJSON(w, publicContentResponse{Kind: "portfolio", Portfolio: portfolio})
			return
		}

		if slug != nil {
			resume, err := pg.PublicResumeWithContent(username, slug)
			if err != nil && !errors.Is(err, store.ErrNotFound) {
				http.Error(w, "server error", http.StatusInternalServerError)
				return
			}
			if resume != nil {
				writePublicJSON(w, publicContentResponse{Kind: "resume", Resume: resume})
				return
			}
		}

		http.NotFound(w, r)
	})
}

func writePublicJSON(w http.ResponseWriter, payload publicContentResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=60")
	_ = json.NewEncoder(w).Encode(payload)
}

// PublicPortfolio serves portfolio JSON for public pages without authentication.
func PublicPortfolio(pg *store.Postgres) http.Handler {
	return PublicContent(pg)
}
