package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	openai "github.com/sashabaranov/go-openai"
)

func (s *Service) RunAgent(
	ctx context.Context,
	userText string,
	assistantContext model.AssistantContextInput,
	history []*model.AssistantMessage,
	attachmentInputs []*model.AssistantAttachmentInput,
	twinContext string,
	githubConnected bool,
	githubLogin string,
	tools *mcp.Registry,
) (*AgentTurn, error) {
	return s.RunAgentStream(ctx, userText, assistantContext, history, attachmentInputs, twinContext, githubConnected, githubLogin, tools, nil)
}

func (s *Service) RunAgentStream(
	ctx context.Context,
	userText string,
	assistantContext model.AssistantContextInput,
	history []*model.AssistantMessage,
	attachmentInputs []*model.AssistantAttachmentInput,
	twinContext string,
	githubConnected bool,
	githubLogin string,
	tools *mcp.Registry,
	sink StreamSink,
) (*AgentTurn, error) {
	if !s.hasAPIKey || tools == nil {
		return nil, ErrMissingAPIKey
	}
	if sink == nil {
		sink = noopStreamSink{}
	}

	attachments := enrichAttachments(attachmentsFromInput(attachmentInputs))
	primary, secondary := selectModel(needsVisionModel(attachments), s.miniModel, s.fallbackModel, s.visionModel)
	turn, err := s.agentLoop(ctx, primary, userText, assistantContext, history, attachments, twinContext, githubConnected, githubLogin, tools, sink)
	if shouldRetryWithFallbackModel(err, turn, userText, assistantContext) {
		turn, err = s.agentLoop(ctx, secondary, userText, assistantContext, history, attachments, twinContext, githubConnected, githubLogin, tools, sink)
	}
	if err != nil {
		return nil, err
	}
	if turn == nil || strings.TrimSpace(turn.Reply) == "" {
		return nil, fmt.Errorf("assistant produced no reply")
	}
	turn.Reply = SanitizeAgentReply(turn.Reply, turn.Executions)
	return turn, nil
}

func (s *Service) agentLoop(
	ctx context.Context,
	modelName string,
	userText string,
	assistantContext model.AssistantContextInput,
	history []*model.AssistantMessage,
	attachments []Attachment,
	twinContext string,
	githubConnected bool,
	githubLogin string,
	tools *mcp.Registry,
	sink StreamSink,
) (*AgentTurn, error) {
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: buildAgentSystemPrompt(assistantContext, twinContext, githubConnected, githubLogin)},
	}
	for _, message := range history {
		role := openai.ChatMessageRoleUser
		if message.Role == model.AssistantMessageRoleAssistant {
			role = openai.ChatMessageRoleAssistant
		}
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    role,
			Content: message.Content,
		})
	}
	messages = append(messages, buildUserMessage(userText, assistantContext, attachments))

	openaiTools := tools.OpenAITools()
	var executions []mcp.Execution
	var lastContent string

	for range maxAgentIterations {
		sink.Status("Thinking…")

		choice, err := s.streamCompletion(ctx, modelName, messages, openaiTools, sink)
		if err != nil {
			if jobTrackerWriteComplete(userText, assistantContext, executions) || tailorWriteComplete(userText, executions) {
				reply := strings.TrimSpace(lastContent)
				if reply == "" {
					reply = briefWriteConfirmation(executions)
				}
				sink.Delta(reply)
				return &AgentTurn{Reply: reply, Executions: executions}, nil
			}
			if successfulWriteTool(executions) && isOpenAIRateLimit(err) {
				sink.Status("Continuing resume population…")
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: resumePopulateNudge,
				})
				choice, err = s.streamCompletion(ctx, modelName, messages, openaiTools, sink)
			}
			if err != nil {
				return nil, fmt.Errorf("openai %s: %w", modelName, err)
			}
		}

		lastContent = strings.TrimSpace(choice.Content)

		if len(choice.ToolCalls) == 0 {
			if shouldNudgeJobTracker(userText, assistantContext, executions, lastContent) {
				sink.Status("Finishing job application…")
				messages = append(messages, choice)
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: jobTrackerNudge,
				})
				lastContent = ""
				continue
			}
			if shouldNudgeResumeWrites(userText, executions, lastContent) {
				sink.Status("Saving resume to workspace…")
				messages = append(messages, choice)
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: resumeWriteNudge,
				})
				lastContent = ""
				continue
			}
			if shouldNudgeWebsiteImport(userText, executions, lastContent) {
				sink.Status("Importing from website…")
				messages = append(messages, choice)
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: websiteImportNudge,
				})
				lastContent = ""
				continue
			}
			if shouldNudgeThinStructuredFields(executions, lastContent) {
				sink.Status("Fixing structured fields…")
				messages = append(messages, choice)
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: structuredFieldsNudgeMessage(executions),
				})
				lastContent = ""
				continue
			}
			if lastContent != "" {
				sink.Delta(lastContent)
			}
			if lastContent == "" {
				lastContent = "Done."
			}
			return &AgentTurn{Reply: lastContent, Executions: executions}, nil
		}

		messages = append(messages, choice)
		for _, call := range choice.ToolCalls {
			if call.Type != openai.ToolTypeFunction {
				continue
			}
			fn := call.Function
			var args map[string]any
			if len(fn.Arguments) > 0 {
				_ = json.Unmarshal([]byte(fn.Arguments), &args)
			}
			if args == nil {
				args = map[string]any{}
			}
			startLabel := mcp.ToolActivityStartLabel(fn.Name, args)
			sink.Status(startLabel)
			sink.ToolStart(fn.Name, args)
			progress := &streamToolProgress{sink: sink}
			exec := tools.ExecuteWithProgress(fn.Name, []byte(fn.Arguments), progress)
			executions = append(executions, exec)
			log.Printf(
				"agent_tool tool=%s duration_ms=%d success=%t error=%q summary=%q authenticated_as=%q args=%s",
				fn.Name,
				exec.DurationMs,
				exec.Error == "",
				exec.Error,
				mcp.SummarizeToolResult(fn.Name, exec.Result, exec.Error),
				mcp.AuthenticatedAsFromResult(exec.Result),
				string(mcp.SanitizeToolArgsJSON(exec.Arguments)),
			)
			sink.ToolEnd(exec)
			messages = append(messages, openai.ChatCompletionMessage{
				Role:       openai.ChatMessageRoleTool,
				ToolCallID: call.ID,
				Content:    exec.ResultJSON(),
			})
		}
	}

	if lastContent == "" {
		lastContent = "I've applied the requested changes."
	}
	return &AgentTurn{Reply: lastContent, Executions: executions}, nil
}

type streamToolProgress struct {
	sink StreamSink
}

func (p *streamToolProgress) StepStart(toolName string, args map[string]any) {
	p.sink.ToolStart(toolName, args)
}

func (p *streamToolProgress) StepEnd(exec mcp.Execution) {
	p.sink.ToolEnd(exec)
}

func shouldNudgeJobTracker(userText string, assistantContext model.AssistantContextInput, executions []mcp.Execution, reply string) bool {
	if !userAskedJobTracker(userText, assistantContext) {
		return false
	}
	if jobTrackerWriteComplete(userText, assistantContext, executions) {
		return false
	}
	if isInteractiveClarification(reply) {
		return false
	}
	if onlyResearchTools(executions) {
		return true
	}
	if successfulWriteTool(executions) && !jobTrackerWriteComplete(userText, assistantContext, executions) {
		return true
	}
	return looksLikePersistenceClaim(reply) || looksLikeTextOnlyCVDraft(reply)
}

func shouldRetryWithFallbackModel(err error, turn *AgentTurn, userText string, assistantContext model.AssistantContextInput) bool {
	if turn != nil && jobTrackerWriteComplete(userText, assistantContext, turn.Executions) {
		return false
	}
	if turn != nil && tailorWriteComplete(userText, turn.Executions) {
		return false
	}
	if turn != nil && successfulWriteTool(turn.Executions) {
		return false
	}
	if isOpenAIRateLimit(err) {
		return true
	}
	if err != nil {
		return false
	}
	return turn == nil || strings.TrimSpace(turn.Reply) == ""
}

func isOpenAIRateLimit(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "429") || strings.Contains(msg, "rate limit")
}

func (s *Service) streamCompletion(
	ctx context.Context,
	modelName string,
	messages []openai.ChatCompletionMessage,
	tools []openai.Tool,
	sink StreamSink,
) (openai.ChatCompletionMessage, error) {
	var lastErr error
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			wait := time.Duration(attempt*3) * time.Second
			sink.Status("Waiting for model capacity…")
			select {
			case <-ctx.Done():
				return openai.ChatCompletionMessage{}, ctx.Err()
			case <-time.After(wait):
			}
		}
		choice, err := s.streamCompletionOnce(ctx, modelName, messages, tools, sink)
		if err == nil {
			return choice, nil
		}
		lastErr = err
		if !isOpenAIRateLimit(err) {
			return openai.ChatCompletionMessage{}, err
		}
	}
	return openai.ChatCompletionMessage{}, lastErr
}

func modelHasFixedSamplingParams(modelName string) bool {
	switch {
	case strings.HasPrefix(modelName, "gpt-5"),
		strings.HasPrefix(modelName, "o1"),
		strings.HasPrefix(modelName, "o3"),
		strings.HasPrefix(modelName, "o4"):
		return true
	default:
		return false
	}
}

func buildChatCompletionRequest(
	modelName string,
	messages []openai.ChatCompletionMessage,
	tools []openai.Tool,
) openai.ChatCompletionRequest {
	req := openai.ChatCompletionRequest{
		Model:      modelName,
		Messages:   messages,
		Tools:      tools,
		ToolChoice: "auto",
		Stream:     true,
	}
	if !modelHasFixedSamplingParams(modelName) {
		req.Temperature = 0.2
	}
	return req
}

func (s *Service) streamCompletionOnce(
	ctx context.Context,
	modelName string,
	messages []openai.ChatCompletionMessage,
	tools []openai.Tool,
	sink StreamSink,
) (openai.ChatCompletionMessage, error) {
	stream, err := s.client.CreateChatCompletionStream(ctx, buildChatCompletionRequest(modelName, messages, tools))
	if err != nil {
		return openai.ChatCompletionMessage{}, err
	}
	defer stream.Close()

	var message openai.ChatCompletionMessage
	toolCalls := make(map[int]*openai.ToolCall)

	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return openai.ChatCompletionMessage{}, err
		}
		if len(response.Choices) == 0 {
			continue
		}

		delta := response.Choices[0].Delta
		if delta.Content != "" {
			message.Content += delta.Content
		}
		if delta.Role != "" {
			message.Role = delta.Role
		}

		for _, toolDelta := range delta.ToolCalls {
			idx := 0
			if toolDelta.Index != nil {
				idx = *toolDelta.Index
			}
			call, ok := toolCalls[idx]
			if !ok {
				call = &openai.ToolCall{Type: openai.ToolTypeFunction}
				toolCalls[idx] = call
			}
			if toolDelta.ID != "" {
				call.ID = toolDelta.ID
			}
			if toolDelta.Type != "" {
				call.Type = toolDelta.Type
			}
			if toolDelta.Function.Name != "" {
				call.Function.Name += toolDelta.Function.Name
			}
			if toolDelta.Function.Arguments != "" {
				call.Function.Arguments += toolDelta.Function.Arguments
			}
		}
	}

	if len(toolCalls) > 0 {
		ordered := make([]openai.ToolCall, 0, len(toolCalls))
		for i := 0; i < len(toolCalls); i++ {
			if call, ok := toolCalls[i]; ok {
				ordered = append(ordered, *call)
			}
		}
		message.ToolCalls = ordered
	}

	if message.Role == "" {
		message.Role = openai.ChatMessageRoleAssistant
	}
	return message, nil
}
