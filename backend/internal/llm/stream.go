package llm

import (
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

// StreamSink receives incremental assistant events for HTTP streaming.
type StreamSink interface {
	Status(label string)
	ToolStart(name string, args map[string]any)
	ToolEnd(exec mcp.Execution)
	Delta(text string)
	ResumePatch(content *model.ResumeWithContent)
	PortfolioPatch(content *model.PortfolioWithContent)
}

type noopStreamSink struct{}

func (noopStreamSink) Status(string)                              {}
func (noopStreamSink) ToolStart(string, map[string]any)             {}
func (noopStreamSink) ToolEnd(mcp.Execution)                      {}
func (noopStreamSink) Delta(string)                               {}
func (noopStreamSink) ResumePatch(*model.ResumeWithContent)       {}
func (noopStreamSink) PortfolioPatch(*model.PortfolioWithContent) {}
