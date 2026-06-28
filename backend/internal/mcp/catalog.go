package mcp

import (
	"fmt"
	"strings"
)

// ToolCatalog returns a concise list of tool names and descriptions for system prompts.
func ToolCatalog() string {
	defs := toolDefinitions()
	var b strings.Builder
	b.WriteString("Available tools:\n")
	for _, def := range defs {
		b.WriteString(fmt.Sprintf("- %s: %s\n", def.Name, def.Description))
	}
	return b.String()
}
