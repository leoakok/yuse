package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/leo/ai-weekend/backend/internal/app"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
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
