package httpapi

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/scope"
	"github.com/leo/ai-weekend/backend/internal/storage"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// SessionMiddleware validates the proxy JWT and attaches a scoped CV service to the request context.
type SessionMiddleware struct {
	Pool       *pgxpool.Pool
	Store      *store.Postgres
	LLM        *llm.Service
	AuthSecret string
	Photos     storage.ProfilePhotoUploader
}

func (m SessionMiddleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := auth.ParseBearer(r.Header.Get("Authorization"), m.AuthSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		session, err := store.EnsureSession(r.Context(), m.Pool, claims)
		if errors.Is(err, store.ErrSessionInvalid) {
			http.Error(w, "session invalid", http.StatusUnauthorized)
			return
		}
		if err != nil {
			http.Error(w, "session error", http.StatusInternalServerError)
			return
		}

		scopedStore := m.Store.WithSession(session)
		cvSvc := cv.NewService(scopedStore, m.LLM, m.Photos)
		ctx := scope.With(r.Context(), scope.Value{Session: session, CV: cvSvc})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
