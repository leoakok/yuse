package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/store"
)

type publicDesignResponse struct {
	DesignShare publicDesignShareJSON `json:"designShare"`
	Preview     *model.ResumeWithContent `json:"preview"`
}

// publicDesignShareJSON omits resumeId from public responses to avoid leaking internal IDs.
type publicDesignShareJSON struct {
	ID          string                         `json:"id"`
	ContentMode model.DesignShareContentMode   `json:"contentMode"`
	Title       *string                        `json:"title,omitempty"`
	IsActive    bool                           `json:"isActive"`
	CreatedAt   string                         `json:"createdAt"`
	UpdatedAt   string                         `json:"updatedAt"`
	URLPath     string                         `json:"urlPath"`
}

type publicCuratedThemesResponse struct {
	Themes []*model.CuratedTheme `json:"themes"`
}

func toPublicDesignShare(share *model.DesignShare) publicDesignShareJSON {
	return publicDesignShareJSON{
		ID:          share.ID,
		ContentMode: share.ContentMode,
		Title:       share.Title,
		IsActive:    share.IsActive,
		CreatedAt:   share.CreatedAt,
		UpdatedAt:   share.UpdatedAt,
		URLPath:     share.URLPath,
	}
}

// PublicDesign serves a design share preview without authentication.
func PublicDesign(pg *store.Postgres) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		id := strings.TrimSpace(r.PathValue("id"))
		if id == "" {
			http.NotFound(w, r)
			return
		}

		share, preview, err := pg.PublicDesignPreview(id)
		if errors.Is(err, store.ErrDesignShareNotFound) || share == nil || preview == nil {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		writeDesignJSON(w, publicDesignResponse{
			DesignShare: toPublicDesignShare(share),
			Preview:     preview,
		})
	})
}

// PublicFeaturedDesigns serves landing carousel themes.
func PublicFeaturedDesigns(pg *store.Postgres) http.Handler {
	return publicCuratedThemesHandler(pg, true, false)
}

// PublicThemes serves public theme picker entries.
func PublicThemes(pg *store.Postgres) http.Handler {
	return publicCuratedThemesHandler(pg, false, true)
}

func publicCuratedThemesHandler(pg *store.Postgres, featured, isPublic bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var featuredPtr *bool
		var publicPtr *bool
		if featured {
			featuredPtr = &featured
		}
		if isPublic {
			publicPtr = &isPublic
		}

		themes, err := pg.ListCuratedThemes(featuredPtr, publicPtr)
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
		if themes == nil {
			themes = []*model.CuratedTheme{}
		}
		writeDesignJSON(w, publicCuratedThemesResponse{Themes: themes})
	})
}

func writeDesignJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=60")
	_ = json.NewEncoder(w).Encode(payload)
}
