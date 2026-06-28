package mcp

import (
	"context"
	"encoding/json"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterTools attaches all CV Builder tools to an MCP server instance.
func RegisterTools(server *sdkmcp.Server, registry *Registry) {
	for _, def := range toolDefinitions() {
		name := def.Name
		description := def.Description
		sdkmcp.AddTool(server, &sdkmcp.Tool{Name: name, Description: description}, func(ctx context.Context, req *sdkmcp.CallToolRequest, args map[string]any) (*sdkmcp.CallToolResult, any, error) {
			raw, err := json.Marshal(args)
			if err != nil {
				return nil, map[string]string{"error": err.Error()}, nil
			}
			exec := registry.Execute(name, raw)
			if exec.Error != "" {
				return &sdkmcp.CallToolResult{
					Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: exec.ResultJSON()}},
					IsError: true,
				}, nil, nil
			}
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: exec.ResultJSON()}},
			}, exec.Result, nil
		})
	}
}

// NewMCPServer creates a stdio-ready MCP server wired to the tool registry.
func NewMCPServer(registry *Registry) *sdkmcp.Server {
	server := sdkmcp.NewServer(&sdkmcp.Implementation{
		Name:    "cv-builder",
		Version: "1.0.0",
	}, nil)
	RegisterTools(server, registry)
	return server
}
