package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/leo/ai-weekend/backend/internal/store"
)

// PublicPortfolio serves portfolio JSON for public pages without authentication.
func PublicPortfolio(pg *store.Postgres) http.Handler {
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

		content, err := pg.PublicPortfolioWithContent(username, slug)
		if errors.Is(err, store.ErrNotFound) || content == nil {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=60")
		_ = json.NewEncoder(w).Encode(content)
	})
}
