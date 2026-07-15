package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/internal/store"
	openai "github.com/sashabaranov/go-openai"
)

func TestBuildChatCompletionRequestIncludesStreamUsage(t *testing.T) {
	req := buildChatCompletionRequest("gpt-4o-mini", nil, nil)
	if req.StreamOptions == nil || !req.StreamOptions.IncludeUsage {
		t.Fatal("expected StreamOptions.IncludeUsage")
	}
}

func TestRecordUsageFromStreamChunk(t *testing.T) {
	meter := store.NewMemoryUsageMeter()
	svc := &Service{hasAPIKey: true, meter: meter, miniModel: "gpt-test"}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Error("expected flusher")
			return
		}
		writeSSE := func(payload any) {
			raw, _ := json.Marshal(payload)
			_, _ = w.Write([]byte("data: "))
			_, _ = w.Write(raw)
			_, _ = w.Write([]byte("\n\n"))
			flusher.Flush()
		}
		writeSSE(openai.ChatCompletionStreamResponse{
			Choices: []openai.ChatCompletionStreamChoice{{
				Delta: openai.ChatCompletionStreamChoiceDelta{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "hi",
				},
			}},
		})
		writeSSE(openai.ChatCompletionStreamResponse{
			Usage: &openai.Usage{PromptTokens: 11, CompletionTokens: 7, TotalTokens: 18},
		})
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
		flusher.Flush()
	}))
	defer server.Close()

	cfg := openai.DefaultConfig("test-key")
	cfg.BaseURL = server.URL + "/v1"
	svc.client = openai.NewClientWithConfig(cfg)

	ctx := WithUsageUser(context.Background(), "user-stream")
	msg, err := svc.streamCompletionOnce(ctx, "gpt-test", []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleUser, Content: "hello"},
	}, nil, noopStreamSink{})
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	if !strings.Contains(msg.Content, "hi") {
		t.Fatalf("content: %q", msg.Content)
	}

	events := meter.Events()
	if len(events) != 1 {
		t.Fatalf("events: got %d", len(events))
	}
	if events[0].PromptTokens != 11 || events[0].CompletionTokens != 7 {
		t.Fatalf("tokens: %+v", events[0])
	}
	if events[0].Feature != "assistant" {
		t.Fatalf("feature: %s", events[0].Feature)
	}
}

func TestRecordUsageAttributedUser(t *testing.T) {
	meter := store.NewMemoryUsageMeter()
	svc := &Service{meter: meter}
	svc.recordUsage(context.Background(), "classify", "m", 1, 2)
	if len(meter.Events()) != 0 {
		t.Fatal("expected no record without user")
	}
	ctx := WithUsageUser(context.Background(), "u1")
	svc.recordUsage(ctx, "classify", "m", 3, 4)
	events := meter.Events()
	if len(events) != 1 || events[0].PromptTokens != 3 || events[0].CompletionTokens != 4 {
		t.Fatalf("got %+v", events)
	}
}
