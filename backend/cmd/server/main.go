package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/leo/ai-weekend/backend/graph"
	"github.com/leo/ai-weekend/backend/internal/app"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/httpapi"
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

	sessionMiddleware := httpapi.SessionMiddleware{
		Pool:       pgStore.Pool(),
		Store:      pgStore,
		LLM:        stack.LLM,
		AuthSecret: cfg.AuthSecret,
		Photos:     stack.Photos,
	}

	gqlServer := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
		Resolvers: &graph.Resolver{},
	}))

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.Handle("POST /auth/register", httpapi.Register(pgStore.Pool()))
	mux.Handle("POST /auth/login", httpapi.Login(pgStore.Pool()))
	githubOAuth := httpapi.GitHubOAuthHandlers{Pool: pgStore.Pool(), Config: cfg}
	mux.Handle("GET /auth/github/start", sessionMiddleware.Wrap(http.HandlerFunc(githubOAuth.Start())))
	mux.Handle("GET /auth/github/callback", http.HandlerFunc(githubOAuth.Callback()))
	mux.Handle("POST /graphql", sessionMiddleware.WrapGraphQL(gqlServer))
	mux.Handle("GET /playground", playground.Handler("GraphQL playground", "/graphql"))
	mux.Handle("POST /assistant/stream", sessionMiddleware.Wrap(httpapi.AssistantStream()))
	mux.Handle("GET /public/{username}", httpapi.PublicPortfolio(pgStore))
	mux.Handle("GET /public/{username}/{slug}", httpapi.PublicPortfolio(pgStore))

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
