package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/leo/ai-weekend/backend/internal/automation"
)

// JobAutomationsCron runs due job search automations. Secured with CRON_SECRET header.
func JobAutomationsCron(runner *automation.Runner, cronSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		secret := strings.TrimSpace(cronSecret)
		if secret == "" {
			http.Error(w, "cron not configured", http.StatusServiceUnavailable)
			return
		}
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		if auth == "" {
			auth = strings.TrimSpace(r.Header.Get("X-Cron-Secret"))
		}
		const bearer = "Bearer "
		if strings.HasPrefix(auth, bearer) {
			auth = strings.TrimSpace(strings.TrimPrefix(auth, bearer))
		}
		if auth != secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		processed, err := runner.RunDue(r.Context())
		resp := map[string]any{"processed": processed}
		if err != nil {
			resp["error"] = err.Error()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}
