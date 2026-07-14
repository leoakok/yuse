package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/leo/ai-weekend/backend/internal/scope"
)

type automationRunStreamRequest struct {
	AutomationID string `json:"automationId"`
}

type automationStreamEvent struct {
	Type   string         `json:"type"`
	ID     string         `json:"id,omitempty"`
	Label  string         `json:"label,omitempty"`
	Status string         `json:"status,omitempty"`
	Detail map[string]any `json:"detail,omitempty"`
	Result map[string]any `json:"result,omitempty"`
	Error  string         `json:"error,omitempty"`
}

type automationNDJSONSink struct {
	enc   *json.Encoder
	flush http.Flusher
}

func (s *automationNDJSONSink) Step(id, label, status string, detail map[string]any) {
	_ = s.enc.Encode(automationStreamEvent{
		Type:   "step",
		ID:     id,
		Label:  label,
		Status: status,
		Detail: detail,
	})
	s.flush.Flush()
}

// AutomationRunStream streams live steps for a manual automation run (admin).
func AutomationRunStream() http.HandlerFunc {
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

		LimitRequestBody(w, r, MaxGraphQLBodyBytes)

		var req automationRunStreamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.AutomationID == "" {
			http.Error(w, "automationId is required", http.StatusBadRequest)
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

		sink := &automationNDJSONSink{enc: json.NewEncoder(w), flush: flusher}
		result, err := cvSvc.RunJobAutomationNowWithProgress(r.Context(), req.AutomationID, sink)
		if err != nil {
			_ = sink.enc.Encode(automationStreamEvent{Type: "error", Error: err.Error()})
			flusher.Flush()
			if result == nil {
				return
			}
		}

		payload := map[string]any{}
		if result != nil {
			payload["run"] = result.Run
			payload["matches"] = result.Matches
		}
		_ = sink.enc.Encode(automationStreamEvent{Type: "done", Result: payload})
		flusher.Flush()
	}
}
