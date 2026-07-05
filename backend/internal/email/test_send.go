package email

import (
	"fmt"
	"strings"
)

const testPreviewToken = "test-preview"

// SendTestEmail delivers a preview of a transactional email using dummy links.
func SendTestEmail(cfg Config, kind, to, appOrigin string) error {
	base := strings.TrimRight(strings.TrimSpace(appOrigin), "/")
	if base == "" {
		base = "https://yuse.one"
	}

	switch strings.ToUpper(strings.TrimSpace(kind)) {
	case "WELCOME":
		return sendTestWelcome(cfg, to, base)
	case "BETA_APPROVAL":
		return sendTestBetaApproval(cfg, to, base+"/login")
	case "EMAIL_VERIFICATION":
		return sendTestVerification(cfg, to, base+"/verify-email?token="+testPreviewToken)
	case "PASSWORD_RESET":
		return sendTestPasswordReset(cfg, to, base+"/reset-password?token="+testPreviewToken)
	default:
		return fmt.Errorf("unknown test email type %q", kind)
	}
}

func sendTestWelcome(cfg Config, to, appURL string) error {
	body, err := welcomeBody("Preview User", appURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("Welcome to Yuse", "Your Yuse account is ready.", body)
	if err != nil {
		return err
	}
	return cfg.sendRequired("test welcome", to, "Welcome to Yuse", html)
}

func sendTestBetaApproval(cfg Config, to, loginURL string) error {
	body, err := waitlistApprovalBody(loginURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("You are in", "Your Yuse waitlist request was approved.", body)
	if err != nil {
		return err
	}
	return cfg.sendRequired("test waitlist approval", to, "You are in. Create your Yuse account", html)
}

func sendTestVerification(cfg Config, to, verifyURL string) error {
	body, err := verificationBody(verifyURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("Verify your email", "Confirm your Yuse email address.", body)
	if err != nil {
		return err
	}
	return cfg.sendRequired("test verification", to, "Verify your Yuse email", html)
}

func sendTestPasswordReset(cfg Config, to, resetURL string) error {
	body, err := passwordResetBody(resetURL)
	if err != nil {
		return err
	}
	html, err := renderEmail("Reset your password", "Reset your Yuse password.", body)
	if err != nil {
		return err
	}
	return cfg.sendRequired("test password reset", to, "Reset your Yuse password", html)
}
