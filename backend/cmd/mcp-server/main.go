package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/leo/ai-weekend/backend/internal/app"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func main() {
	_ = godotenv.Load()

	if err := assertMCPDevGate(); err != nil {
		log.Fatalf("mcp dev gate: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if looksLikeProductionDatabaseURL(cfg.DatabaseURL) {
		log.Fatalf("mcp dev gate: refusing production DATABASE_URL")
	}

	ctx := context.Background()
	stack, err := app.Bootstrap(ctx, cfg)
	if err != nil {
		log.Fatalf("bootstrap: %v", err)
	}
	defer stack.Close()

	server := mcp.NewMCPServer(stack.Tools)
	log.Println("cv-builder MCP server ready (stdio)")
	if err := server.Run(ctx, &sdkmcp.StdioTransport{}); err != nil {
		log.Fatalf("mcp server: %v", err)
	}
}

func assertMCPDevGate() error {
	if strings.TrimSpace(os.Getenv("MCP_DEV_ONLY")) != "true" {
		return fmt.Errorf("set MCP_DEV_ONLY=true to run the MCP stdio server (development only)")
	}
	return nil
}

func looksLikeProductionDatabaseURL(dsn string) bool {
	lower := strings.ToLower(strings.TrimSpace(dsn))
	if lower == "" {
		return false
	}
	if strings.Contains(lower, "localhost") ||
		strings.Contains(lower, "127.0.0.1") ||
		strings.Contains(lower, "@postgres:") ||
		strings.Contains(lower, "host=postgres") {
		return false
	}
	markers := []string{
		"neon.tech",
		"supabase.co",
		"amazonaws.com",
		"rds.amazonaws.com",
		"render.com",
		"railway.app",
		"fly.io",
		"planetscale",
		"cockroachlabs",
		"vercel-storage",
		"/prod",
		"_prod",
		"production",
	}
	for _, marker := range markers {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	if strings.Contains(lower, "sslmode=require") || strings.Contains(lower, "sslmode=verify") {
		return true
	}
	return false
}
