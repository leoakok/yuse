package llm

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

// RunRuleAgentForTest exposes the deterministic rule agent for unit tests.
func RunRuleAgentForTest(s *Service, userText string, ctx model.AssistantContextInput, tools *mcp.Registry) (*AgentTurn, error) {
	reply, executions, err := s.runRuleAgent(userText, ctx, nil, "", tools)
	if err != nil {
		return nil, err
	}
	return &AgentTurn{Reply: reply, Executions: executions}, nil
}

// RunAgentLoopForTest runs one agent loop turn with a stubbed OpenAI hook for integration tests.
func RunAgentLoopForTest(
	s *Service,
	ctx context.Context,
	userText string,
	assistantContext model.AssistantContextInput,
	tools *mcp.Registry,
) (*AgentTurn, error) {
	svc := &Service{hasAPIKey: true}
	return svc.agentLoop(
		ctx,
		"test-model",
		userText,
		assistantContext,
		nil,
		nil,
		"",
		false,
		"",
		tools,
		model.AssistantCategoryJobApplication,
		"",
		noopStreamSink{},
	)
}
