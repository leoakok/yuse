package email

import (
	"fmt"
	"log"
	"os"
	"strings"
)

// Config holds optional outbound email settings.
type Config struct {
	Provider string
	From     string
	APIKey   string
}

// LoadConfig reads email provider settings from the environment.
func LoadConfig() Config {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("EMAIL_API_KEY"))
	}
	return Config{
		Provider: strings.TrimSpace(os.Getenv("EMAIL_PROVIDER")),
		From:     strings.TrimSpace(os.Getenv("EMAIL_FROM")),
		APIKey:   apiKey,
	}
}

// IsConfigured reports whether outbound email can be sent.
func (c Config) IsConfigured() bool {
	switch strings.ToLower(c.Provider) {
	case "resend":
		return c.From != "" && c.APIKey != ""
	default:
		return false
	}
}

func (c Config) send(to, subject, html string) error {
	switch strings.ToLower(c.Provider) {
	case "resend":
		return sendViaResend(c, to, subject, html)
	case "smtp":
		return fmt.Errorf("smtp is not supported; set EMAIL_PROVIDER=resend and RESEND_API_KEY")
	default:
		return fmt.Errorf("unknown email provider %q", c.Provider)
	}
}

func (c Config) sendOrLog(kind, to, subject, html string) error {
	if !c.IsConfigured() {
		log.Printf("[email] %s not sent (provider not configured) to=%s", kind, to)
		return nil
	}
	return c.sendRequired(kind, to, subject, html)
}

func (c Config) sendRequired(kind, to, subject, html string) error {
	if !c.IsConfigured() {
		return fmt.Errorf("email provider is not configured")
	}
	if err := c.send(to, subject, html); err != nil {
		return err
	}
	log.Printf("[email] %s sent to=%s", kind, to)
	return nil
}

// SendWelcomeEmail greets a new user on first signup.
func SendWelcomeEmail(cfg Config, to, displayName, appURL string) error {
	body, err := welcomeBody(displayName, strings.TrimRight(appURL, "/"))
	if err != nil {
		return err
	}
	html, err := renderEmail("Welcome to Yuse", "Your Yuse account is ready.", body)
	if err != nil {
		return err
	}
	return cfg.sendOrLog("welcome", to, "Welcome to Yuse", html)
}

// SendWaitlistApprovalEmail notifies a user they can sign up.
func SendWaitlistApprovalEmail(cfg Config, to, loginURL string) error {
	body, err := waitlistApprovalBody(loginURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("You are in", "Your Yuse waitlist request was approved.", body)
	if err != nil {
		return err
	}
	return cfg.sendOrLog("waitlist approval", to, "You are in. Create your Yuse account", html)
}

// SendVerificationEmail delivers a verification link.
func SendVerificationEmail(cfg Config, to, verifyURL string) error {
	body, err := verificationBody(verifyURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("Verify your email", "Confirm your Yuse email address.", body)
	if err != nil {
		return err
	}
	return cfg.sendOrLog("verification", to, "Verify your Yuse email", html)
}

// SendPasswordResetEmail delivers a password reset link.
func SendPasswordResetEmail(cfg Config, to, resetURL string) error {
	body, err := passwordResetBody(resetURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("Reset your password", "Reset your Yuse password.", body)
	if err != nil {
		return err
	}
	return cfg.sendOrLog("password reset", to, "Reset your Yuse password", html)
}
