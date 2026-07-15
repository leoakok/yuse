package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/leo/ai-weekend/backend/internal/auth"
	"github.com/leo/ai-weekend/backend/internal/automation"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/email"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/ratelimit"
	"github.com/leo/ai-weekend/backend/internal/scope"
	"github.com/leo/ai-weekend/backend/internal/storage"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// SessionMiddleware validates the proxy JWT and attaches a scoped CV service to the request context.
type SessionMiddleware struct {
	Pool                      *pgxpool.Pool
	Store                     *store.Postgres
	LLM                       *llm.Service
	AuthSecret                string
	Photos                    storage.ProfilePhotoUploader
	EmailVerificationRequired bool
	AssistantLimiter          *ratelimit.Limiter
	AccountLimiter            *ratelimit.Limiter
	TestEmailLimiter          *ratelimit.Limiter
	EmailCfg                  email.Config
	AppOrigin                 string
	AutomationRunner          *automation.Runner
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
		if errors.Is(err, store.ErrNotApproved) {
			http.Error(w, "not approved", http.StatusForbidden)
			return
		}
		if errors.Is(err, store.ErrUserDeactivated) {
			http.Error(w, "account deactivated", http.StatusForbidden)
			return
		}
		if err != nil {
			http.Error(w, "session error", http.StatusInternalServerError)
			return
		}

		scopedStore := m.Store.WithSession(session)
		cvSvc := m.newCVService(scopedStore)
		ctx := scope.With(r.Context(), m.scopeValue(session, cvSvc))
		ctx = llm.WithUsageUser(ctx, session.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m SessionMiddleware) newCVService(scopedStore store.Store) *cv.Service {
	cvSvc := cv.NewService(scopedStore, m.LLM, m.Photos)
	if m.AutomationRunner != nil {
		cvSvc.ConfigureAutomationRunner(m.AutomationRunner)
	}
	return cvSvc
}

func (m SessionMiddleware) WrapGraphQL(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		claims, err := auth.ParseBearer(authHeader, m.AuthSecret)
		if err != nil {
			if auth.IsMissingBearer(err) || authHeader == "" {
				ctx := scope.With(r.Context(), scope.Value{Postgres: m.Store})
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		session, err := store.EnsureSession(r.Context(), m.Pool, claims)
		if errors.Is(err, store.ErrSessionInvalid) {
			http.Error(w, "session invalid", http.StatusUnauthorized)
			return
		}
		if errors.Is(err, store.ErrNotApproved) {
			http.Error(w, "not approved", http.StatusForbidden)
			return
		}
		if errors.Is(err, store.ErrUserDeactivated) {
			http.Error(w, "account deactivated", http.StatusForbidden)
			return
		}
		if err != nil {
			http.Error(w, "session error", http.StatusInternalServerError)
			return
		}

		scopedStore := m.Store.WithSession(session)
		cvSvc := m.newCVService(scopedStore)
		ctx := scope.With(r.Context(), m.scopeValue(session, cvSvc))
		ctx = llm.WithUsageUser(ctx, session.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m SessionMiddleware) scopeValue(session store.SessionScope, cvSvc *cv.Service) scope.Value {
	return scope.Value{
		Session:  session,
		CV:       cvSvc,
		Postgres: m.Store,
		Security: scope.SecurityContext{
			EmailVerificationRequired: m.EmailVerificationRequired,
			Pool:                      m.Pool,
			AssistantLimiter:          m.AssistantLimiter,
			AccountLimiter:            m.AccountLimiter,
			TestEmailLimiter:          m.TestEmailLimiter,
			Email:                     m.EmailCfg,
			AppOrigin:                 m.AppOrigin,
		},
	}
}
