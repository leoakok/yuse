package llm_test

import (
	"context"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/config"
	"github.com/leo/ai-weekend/backend/internal/cv"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/store"
	openai "github.com/sashabaranov/go-openai"
)

func TestAgentLoopPostToolNudgeAfterPrematureCreate(t *testing.T) {
	type mockStep struct {
		content   string
		toolCalls []openai.ToolCall
	}
	steps := []mockStep{
		{
			toolCalls: []openai.ToolCall{{
				ID:   "call_create",
				Type: openai.ToolTypeFunction,
				Function: openai.FunctionCall{
					Name:      "create_resume",
					Arguments: `{"title":"Forward Deployed Engineer"}`,
				},
			}},
		},
		{
			content: "Created the CV shell for a Forward Deployed Engineer and set the title and layout. If you want, I can now tailor it with your real experience and skills.",
		},
		{
			toolCalls: []openai.ToolCall{{
				ID:   "call_search",
				Type: openai.ToolTypeFunction,
				Function: openai.FunctionCall{
					Name:      "web_search",
					Arguments: `{"query":"forward deployed engineer requirements skills"}`,
				},
			}},
		},
	}
	calls := 0
	llm.AgentLoopCompletionHook = func(
		_ context.Context,
		_ string,
		_ []openai.ChatCompletionMessage,
		_ []openai.Tool,
		_ llm.StreamSink,
	) (openai.ChatCompletionMessage, error) {
		if calls >= len(steps) {
			return openai.ChatCompletionMessage{Role: openai.ChatMessageRoleAssistant}, nil
		}
		step := steps[calls]
		calls++
		return openai.ChatCompletionMessage{
			Role:      openai.ChatMessageRoleAssistant,
			Content:   step.content,
			ToolCalls: step.toolCalls,
		}, nil
	}
	t.Cleanup(func() { llm.AgentLoopCompletionHook = nil })

	dataStore := store.NewMemory()
	llmSvc := llm.NewService(config.Config{})
	cvSvc := cv.NewService(dataStore, llmSvc, nil)
	tools := mcp.NewRegistry(cvSvc)
	turn, err := llm.RunAgentLoopForTest(
		llmSvc,
		context.Background(),
		"create a cv for forward deployed engineer role",
		model.AssistantContextInput{View: model.AssistantViewResumes},
		tools,
	)
	if err != nil {
		t.Fatalf("RunAgentLoopForTest: %v", err)
	}
	if calls < 3 {
		t.Fatalf("expected at least 3 model calls (create, nudge reply, research), got %d", calls)
	}
	if !hasSuccessfulTool(turn.Executions, "create_resume") {
		t.Fatalf("expected create_resume execution, got %+v", toolNames(turn.Executions))
	}
	if !hasSuccessfulTool(turn.Executions, "web_search") {
		t.Fatalf("expected web_search after post-tool nudge, got %+v", toolNames(turn.Executions))
	}
}

func hasSuccessfulTool(execs []mcp.Execution, name string) bool {
	for _, exec := range execs {
		if exec.Tool == name && exec.Error == "" {
			return true
		}
	}
	return false
}

func toolNames(execs []mcp.Execution) []string {
	out := make([]string, 0, len(execs))
	for _, exec := range execs {
		out = append(out, exec.Tool)
	}
	return out
}
