package llm

import (
	"context"
	"fmt"

	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	openai "github.com/sashabaranov/go-openai"
)

const maxAgentIterations = 20

var ErrMissingAPIKey = fmt.Errorf("OPENAI_API_KEY is not configured")

type Service struct {
	client        *openai.Client
	miniModel     string
	fallbackModel string
	visionModel   string
	hasAPIKey     bool
}

// AgentLoopCompletionHook is set by llm tests to stub OpenAI chat completions.
var AgentLoopCompletionHook func(
	ctx context.Context,
	modelName string,
	messages []openai.ChatCompletionMessage,
	tools []openai.Tool,
	sink StreamSink,
) (openai.ChatCompletionMessage, error)

func NewService(cfg config.Config) *Service {
	hasKey := cfg.HasOpenAIKey()
	var client *openai.Client
	if hasKey {
		client = openai.NewClient(cfg.OpenAIAPIKey)
	}
	return &Service{
		client:        client,
		miniModel:     cfg.OpenAIMiniModel,
		fallbackModel: cfg.OpenAIFallbackModel,
		visionModel:   cfg.OpenAIVisionModel,
		hasAPIKey:     hasKey,
	}
}

// AgentTurn is the result of one assistant turn with tool executions.
type AgentTurn struct {
	Reply      string
	Executions []mcp.Execution
}

// SetTools is deprecated: pass a per-request registry into RunAgent instead.
func (s *Service) SetTools(registry *mcp.Registry) {}
