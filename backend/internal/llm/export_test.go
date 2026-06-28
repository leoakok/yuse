package llm

import (
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
