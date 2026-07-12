package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/leo/ai-weekend/backend/graph"
	"github.com/leo/ai-weekend/backend/internal/app"
	"github.com/leo/ai-weekend/backend/internal/automation"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/email"
	"github.com/leo/ai-weekend/backend/internal/httpapi"
	"github.com/leo/ai-weekend/backend/internal/ratelimit"
	"github.com/leo/ai-weekend/backend/internal/store"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if err := cfg.ValidateServer(); err != nil {
		log.Fatalf("invalid config: %v", err)
	}
	store.ConfigureAdminEmails(cfg.AdminEmails)

	emailCfg := email.LoadConfig()
	verificationRequired := cfg.EmailVerificationRequired || emailCfg.IsConfigured()

	ctx := context.Background()
	stack, err := app.Bootstrap(ctx, cfg)
	if err != nil {
		log.Fatalf("bootstrap: %v", err)
	}
	defer stack.Close()

	pgStore, ok := stack.Store.(*store.Postgres)
	if !ok {
		log.Fatal("expected postgres store")
	}

	autoRunner := &automation.Runner{
		Pool:      pgStore.Pool(),
		LLM:       stack.LLM,
		Email:     emailCfg,
		AppOrigin: strings.TrimRight(cfg.CORSOrigin, "/"),
	}
	stack.CV.ConfigureAutomationRunner(autoRunner)

	loginLimiter := ratelimit.New(cfg.RateLimitLoginPerIP, cfg.RateLimitLoginWindow)
	registerLimiter := ratelimit.New(cfg.RateLimitRegisterPerIP, cfg.RateLimitRegisterWindow)
	waitlistLimiter := ratelimit.New(cfg.RateLimitWaitlistPerIP, cfg.RateLimitWaitlistWindow)
	accessCheckLimiter := ratelimit.New(cfg.RateLimitAccessCheckPerIP, cfg.RateLimitAccessCheckWindow)
	graphqlLimiter := ratelimit.New(cfg.RateLimitGraphQLPerIP, cfg.RateLimitGraphQLWindow)
	assistantLimiter := ratelimit.New(cfg.RateLimitAssistantPerUser, cfg.RateLimitAssistantWindow)
	accountLimiter := ratelimit.New(cfg.RateLimitAccountPerUser, cfg.RateLimitAccountWindow)
	testEmailLimiter := ratelimit.New(10, time.Hour)

	sessionMiddleware := httpapi.SessionMiddleware{
		Pool:                      pgStore.Pool(),
		Store:                     pgStore,
		LLM:                       stack.LLM,
		AuthSecret:                cfg.AuthSecret,
		Photos:                    stack.Photos,
		EmailVerificationRequired: verificationRequired,
		AssistantLimiter:          assistantLimiter,
		AccountLimiter:            accountLimiter,
		TestEmailLimiter:          testEmailLimiter,
		EmailCfg:                  emailCfg,
		AppOrigin:                 strings.TrimRight(cfg.CORSOrigin, "/"),
		AutomationRunner:          autoRunner,
	}

	gqlServer := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{},
	}))
	gqlServer.AroundOperations(graph.AroundOperations)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	ipKey := func(r *http.Request) string { return "ip:" + httpapi.ClientIP(r) }
	mux.Handle("POST /auth/register", registerLimiter.Middleware(ipKey)(httpapi.Register(pgStore.Pool(), emailCfg, strings.TrimRight(cfg.CORSOrigin, "/"), verificationRequired)))
	mux.Handle("POST /auth/login", loginLimiter.Middleware(ipKey)(httpapi.Login(pgStore.Pool())))
	mux.Handle("POST /auth/forgot-password", loginLimiter.Middleware(ipKey)(httpapi.ForgotPassword(pgStore.Pool(), emailCfg, strings.TrimRight(cfg.CORSOrigin, "/"))))
	mux.Handle("POST /auth/reset-password", loginLimiter.Middleware(ipKey)(httpapi.ResetPassword(pgStore.Pool())))
	mux.Handle("GET /auth/verify-email", httpapi.VerifyEmail(pgStore.Pool()))
	mux.Handle("POST /waitlist", waitlistLimiter.Middleware(ipKey)(httpapi.JoinWaitlist(pgStore.Pool())))
	mux.Handle("POST /auth/access-check", accessCheckLimiter.Middleware(ipKey)(httpapi.CheckAccess(pgStore.Pool())))
	mux.Handle("GET /invites/{code}", httpapi.PublicInvite(pgStore.Pool()))
	mux.Handle("POST /auth/claim-invite", accessCheckLimiter.Middleware(ipKey)(httpapi.ClaimInvite(pgStore.Pool())))

	githubOAuth := httpapi.GitHubOAuthHandlers{Pool: pgStore.Pool(), Config: cfg}
	mux.Handle("GET /auth/github/start", sessionMiddleware.Wrap(http.HandlerFunc(githubOAuth.Start())))
	mux.Handle("GET /auth/github/callback", http.HandlerFunc(githubOAuth.Callback()))

	graphqlHandler := sessionMiddleware.WrapGraphQL(gqlServer)
	mux.Handle("POST /graphql", graphqlLimiter.Middleware(ipKey)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpapi.LimitRequestBody(w, r, httpapi.MaxGraphQLBodyBytes)
		graphqlHandler.ServeHTTP(w, r)
	})))

	if cfg.EnableGraphQLPlayground {
		mux.Handle("GET /playground", playground.Handler("GraphQL playground", "/graphql"))
	}

	mux.Handle("POST /assistant/stream", sessionMiddleware.Wrap(httpapi.AssistantStream()))
	mux.Handle("GET /public/{username}", httpapi.PublicPortfolio(pgStore))
	mux.Handle("GET /public/{username}/{slug}", httpapi.PublicPortfolio(pgStore))
	cronHandler := httpapi.JobAutomationsCron(autoRunner, cfg.CronSecret)
	mux.Handle("GET /internal/cron/job-automations", cronHandler)
	mux.Handle("POST /internal/cron/job-automations", cronHandler)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{cfg.CORSOrigin},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}).Handler(mux)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           corsHandler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
