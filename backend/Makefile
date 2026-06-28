.PHONY: run mcp-server generate test tidy build-mcp

run:
	go run ./cmd/server

mcp-server:
	go run ./cmd/mcp-server

build-mcp:
	go build -o bin/cv-mcp ./cmd/mcp-server

generate:
	go run github.com/99designs/gqlgen generate

tidy:
	go mod tidy

test:
	go test ./...
