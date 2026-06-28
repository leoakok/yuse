package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
	"github.com/leo/ai-weekend/backend/internal/scope"
)

type AssistantStreamRequest struct {
	ThreadID    string                             `json:"threadId"`
	Text        string                             `json:"text"`
	Context     model.AssistantContextInput        `json:"context"`
	Attachments []*model.AssistantAttachmentInput `json:"attachments"`
}

type streamEvent struct {
	Type    string         `json:"type"`
	Label   string         `json:"label,omitempty"`
	Content string         `json:"content,omitempty"`
	Tool    *streamTool    `json:"tool,omitempty"`
	Result  map[string]any `json:"result,omitempty"`
	Error   string         `json:"error,omitempty"`
}

type streamTool struct {
	Name            string         `json:"name"`
	Arguments       map[string]any `json:"arguments,omitempty"`
	Success         bool           `json:"success,omitempty"`
	Error           string         `json:"error,omitempty"`
	DurationMs      int64          `json:"durationMs,omitempty"`
	ResultSummary   string         `json:"resultSummary,omitempty"`
	AuthenticatedAs string         `json:"authenticatedAs,omitempty"`
}

type ndjsonSink struct {
	enc   *json.Encoder
	flush http.Flusher
}

func (s *ndjsonSink) Status(label string) {
	_ = s.enc.Encode(streamEvent{Type: "status", Label: label})
	s.flush.Flush()
}

func (s *ndjsonSink) ToolStart(name string, args map[string]any) {
	label := mcp.ToolActivityStartLabel(name, args)
	_ = s.enc.Encode(streamEvent{
		Type:  "tool_start",
		Label: label,
		Tool: &streamTool{
			Name:      name,
			Arguments: args,
		},
	})
	s.flush.Flush()
}

func (s *ndjsonSink) ToolEnd(exec mcp.Execution) {
	eventType := "tool_end"
	if exec.Error != "" {
		eventType = "tool_error"
	}
	summary := mcp.SummarizeToolResult(exec.Tool, exec.Result, exec.Error)
	authAs := mcp.AuthenticatedAsFromResult(exec.Result)
	_ = s.enc.Encode(streamEvent{
		Type:  eventType,
		Label: mcp.ToolActivityEndLabel(exec),
		Tool: &streamTool{
			Name:            exec.Tool,
			Success:         exec.Error == "",
			Error:           exec.Error,
			DurationMs:      exec.DurationMs,
			ResultSummary:   summary,
			AuthenticatedAs: authAs,
		},
	})
	s.flush.Flush()
}

func (s *ndjsonSink) Delta(text string) {
	if text == "" {
		return
	}
	_ = s.enc.Encode(streamEvent{Type: "delta", Content: text})
	s.flush.Flush()
}

func (s *ndjsonSink) ResumePatch(content *model.ResumeWithContent) {
	if content == nil {
		return
	}
	_ = s.enc.Encode(streamEvent{
		Type: "resume_patch",
		Result: map[string]any{
			"resumeWithContent": content,
		},
	})
	s.flush.Flush()
}

func AssistantStream() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		cvSvc := scope.CV(r.Context())
		if cvSvc == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req AssistantStreamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		sink := &ndjsonSink{enc: json.NewEncoder(w), flush: flusher}
		result, err := cvSvc.SendAssistantMessageStream(r.Context(), req.ThreadID, req.Text, req.Context, req.Attachments, sink)
		if err != nil {
			_ = sink.enc.Encode(streamEvent{Type: "error", Error: err.Error()})
			flusher.Flush()
			return
		}

		payload := map[string]any{
			"messages":          result.Messages,
			"actionLogs":        result.ActionLogs,
			"affectedResumeIds": result.AffectedResumeIds,
			"resumeWithContent": result.ResumeWithContent,
		}
		_ = sink.enc.Encode(streamEvent{Type: "done", Result: payload})
		flusher.Flush()
	}
}
