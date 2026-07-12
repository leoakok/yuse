package email

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"strings"
)

//go:embed templates/*.html
var templateFS embed.FS

// Brand colors aligned with src/app/globals.css (primary orange, warm neutrals).
const (
	brandPrimary      = "#c45c2a"
	brandBackground   = "#f9f8f6"
	brandForeground   = "#3d3a36"
	brandMuted        = "#6b6560"
	brandGoldenCircle = "#d4a853"
)

type layoutData struct {
	Title       string
	Preheader   string
	ContentHTML template.HTML
}

type buttonData struct {
	URL   string
	Label string
}

var (
	layoutTmpl *template.Template
	buttonTmpl *template.Template
)

func init() {
	var err error
	layoutTmpl, err = template.ParseFS(templateFS, "templates/layout.html")
	if err != nil {
		panic(fmt.Sprintf("parse email layout: %v", err))
	}
	buttonTmpl, err = template.ParseFS(templateFS, "templates/button.html")
	if err != nil {
		panic(fmt.Sprintf("parse email button: %v", err))
	}
}

func renderButton(url, label string) (string, error) {
	var buf bytes.Buffer
	if err := buttonTmpl.Execute(&buf, buttonData{URL: url, Label: label}); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func renderEmail(title, preheader, bodyHTML string) (string, error) {
	var buf bytes.Buffer
	err := layoutTmpl.Execute(&buf, layoutData{
		Title:       title,
		Preheader:   preheader,
		ContentHTML: template.HTML(bodyHTML),
	})
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

func welcomeBody(displayName, appURL string) (string, error) {
	name := strings.TrimSpace(displayName)
	if name == "" {
		name = "there"
	}
	btn, err := renderButton(appURL, "Open Yuse")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Hi %s,</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Welcome to Yuse. We built this for people who want their resume and portfolio to feel personal, not like another template from a job board.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Import your experience, refine it with the assistant, and share a link you are proud to send. The golden circle in our brand is a reminder: your work should stand out at the center, not fade into the margins.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:%s;">Start with a resume import or ask the assistant to draft your first section.</p>
%s
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:%s;">If you did not create this account, you can ignore this email.</p>`,
		brandForeground, template.HTMLEscapeString(name),
		brandForeground,
		brandForeground,
		brandForeground,
		btn,
		brandMuted,
	), nil
}

func waitlistApprovalBody(loginURL string) (string, error) {
	btn, err := renderButton(loginURL, "Create your account")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Your waitlist request was approved.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">You can now sign in or create your Yuse account. We are glad you are here.</p>
%s
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:%s;">If you did not request access, you can ignore this email.</p>`,
		brandForeground,
		brandForeground,
		btn,
		brandMuted,
	), nil
}

func verificationBody(verifyURL string) (string, error) {
	btn, err := renderButton(verifyURL, "Verify email")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Confirm your email address to use Yuse.</p>
%s
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:%s;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
		brandForeground,
		btn,
		brandMuted,
	), nil
}

func passwordResetBody(resetURL string) (string, error) {
	btn, err := renderButton(resetURL, "Reset password")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">We received a request to reset your Yuse password.</p>
%s
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:%s;">This link expires in one hour. If you did not request a reset, you can ignore this email. Your password will not change.</p>`,
		brandForeground,
		btn,
		brandMuted,
	), nil
}

func jobAutomationMatchesBody(automationName string, jobs []jobMatchEmailItem) (string, error) {
	var items strings.Builder
	for _, job := range jobs {
		company := strings.TrimSpace(job.Company)
		if company != "" {
			company = " · " + template.HTMLEscapeString(company)
		}
		location := strings.TrimSpace(job.Location)
		locLine := ""
		if location != "" {
			locLine = fmt.Sprintf(`<p style="margin:4px 0 0;font-size:14px;color:%s;">%s</p>`, brandMuted, template.HTMLEscapeString(location))
		}
		items.WriteString(fmt.Sprintf(`<div style="margin:0 0 20px;padding-bottom:20px;border-bottom:1px solid #e8e4df;">
<p style="margin:0;font-size:16px;font-weight:600;color:%s;"><a href="%s" style="color:%s;text-decoration:none;">%s</a>%s</p>
%s
</div>`,
			brandForeground,
			template.HTMLEscapeString(job.URL),
			brandPrimary,
			template.HTMLEscapeString(job.Title),
			company,
			locLine,
		))
	}
	name := strings.TrimSpace(automationName)
	if name == "" {
		name = "your automation"
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">%d new job%s matched <strong>%s</strong>.</p>
%s
<p style="margin:0;font-size:14px;line-height:1.5;color:%s;">Matches are based on your criteria. Tune the automation if results are too broad or narrow.</p>`,
		brandForeground,
		len(jobs),
		pluralS(len(jobs)),
		template.HTMLEscapeString(name),
		items.String(),
		brandMuted,
	), nil
}

func linkedInSessionExpiredBody(appURL string) (string, error) {
	btn, err := renderButton(appURL+"/admin", "Open admin settings")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Your saved LinkedIn session expired or was rejected.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:%s;">Job search automations are paused until you paste a fresh cookie from LinkedIn DevTools.</p>
%s`,
		brandForeground,
		brandForeground,
		btn,
	), nil
}

type jobMatchEmailItem struct {
	Title    string
	Company  string
	Location string
	URL      string
}

// JobMatchEmailItem is one job row in a match notification email.
type JobMatchEmailItem = jobMatchEmailItem

func pluralS(count int) string {
	if count == 1 {
		return ""
	}
	return "s"
}
