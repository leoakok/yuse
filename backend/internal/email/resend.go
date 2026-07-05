package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type resendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type resendErrorResponse struct {
	Message string `json:"message"`
}

func sendViaResend(cfg Config, to, subject, html string) error {
	payload := resendEmailRequest{
		From:    cfg.From,
		To:      []string{strings.TrimSpace(to)},
		Subject: subject,
		HTML:    html,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal resend payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return fmt.Errorf("read resend response: %w", err)
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	var apiErr resendErrorResponse
	if json.Unmarshal(respBody, &apiErr) == nil && strings.TrimSpace(apiErr.Message) != "" {
		return fmt.Errorf("resend: %s", apiErr.Message)
	}
	return fmt.Errorf("resend: HTTP %d", resp.StatusCode)
}
