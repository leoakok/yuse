package slug

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

const (
	MinLength = 3
	MaxLength = 30
)

var validPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$`)

// reservedSlugs blocks paths that collide with app routes, auth, infra, and common abuse targets.
var reservedSlugs = map[string]struct{}{
	// Yuse app routes
	"home": {}, "login": {}, "logout": {}, "register": {}, "signup": {}, "signin": {}, "signout": {},
	"settings": {}, "admin": {}, "portfolios": {}, "portfolio": {}, "resumes": {}, "resume": {},
	"print": {}, "connections": {}, "digital-twin": {}, "job-tracker": {}, "logo-preview": {},
	"assistant": {}, "help": {}, "support": {}, "billing": {}, "pricing": {}, "about": {}, "contact": {},
	"privacy": {}, "terms": {}, "legal": {}, "security": {}, "status": {}, "docs": {}, "blog": {},
	// API / infra
	"api": {}, "graphql": {}, "playground": {}, "healthz": {}, "health": {}, "healthcheck": {},
	"public": {}, "static": {}, "assets": {}, "cdn": {}, "media": {}, "upload": {}, "uploads": {},
	"download": {}, "downloads": {}, "files": {}, "images": {}, "img": {}, "css": {}, "js": {},
	"webhook": {}, "webhooks": {}, "callback": {}, "callbacks": {}, "oauth": {}, "auth": {},
	"sso": {}, "mfa": {}, "verify": {}, "confirm": {}, "reset": {}, "password": {},
	// System / admin
	"administrator": {}, "root": {}, "system": {}, "sysadmin": {}, "superuser": {}, "moderator": {}, "mod": {},
	"staff": {}, "team": {}, "internal": {}, "null": {}, "undefined": {}, "true": {}, "false": {},
	"www": {}, "mail": {}, "email": {}, "ftp": {}, "smtp": {}, "imap": {}, "dns": {}, "ssl": {},
	"dev": {}, "staging": {}, "prod": {}, "production": {}, "test": {}, "demo": {}, "sandbox": {},
	// Common SaaS
	"app": {}, "apps": {}, "dashboard": {}, "account": {}, "accounts": {}, "profile": {}, "profiles": {},
	"user": {}, "users": {}, "workspace": {}, "workspaces": {}, "org": {}, "orgs": {}, "organization": {},
	"search": {}, "explore": {}, "feed": {}, "notifications": {}, "inbox": {}, "messages": {}, "chat": {},
	"share": {}, "invite": {}, "join": {}, "create": {}, "new": {}, "edit": {}, "delete": {}, "remove": {},
	// Brands / impersonation basics
	"yuse": {}, "google": {}, "github": {}, "linkedin": {}, "facebook": {}, "twitter": {}, "instagram": {},
	// Basic offensive / abuse (minimal set)
	"abuse": {}, "spam": {}, "scam": {}, "phishing": {}, "porn": {}, "xxx": {}, "sex": {}, "nazi": {},
}

// Normalize converts arbitrary input into a lowercase slug candidate.
func Normalize(raw string) string {
	raw = strings.TrimSpace(strings.ToLower(raw))
	var b strings.Builder
	lastHyphen := false
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastHyphen = false
		case r == '-':
			if b.Len() > 0 && !lastHyphen {
				b.WriteByte('-')
				lastHyphen = true
			}
		case r == ' ' || r == '_' || r == '.' || r == '/':
			if b.Len() > 0 && !lastHyphen {
				b.WriteByte('-')
				lastHyphen = true
			}
		case unicode.IsLetter(r):
			b.WriteRune(unicode.ToLower(r))
			lastHyphen = false
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > MaxLength {
		out = strings.Trim(out[:MaxLength], "-")
	}
	return out
}

// Validate checks format and reserved words. Returns normalized slug on success.
func Validate(raw string) (string, error) {
	normalized := Normalize(raw)
	if normalized == "" {
		return "", fmt.Errorf("enter a URL name using letters, numbers, or hyphens")
	}
	if len(normalized) < MinLength {
		return "", fmt.Errorf("URL name must be at least %d characters", MinLength)
	}
	if len(normalized) > MaxLength {
		return "", fmt.Errorf("URL name must be at most %d characters", MaxLength)
	}
	if !validPattern.MatchString(normalized) {
		return "", fmt.Errorf("URL name must start and end with a letter or number, and use only lowercase letters, numbers, and hyphens")
	}
	if _, blocked := reservedSlugs[normalized]; blocked {
		return "", fmt.Errorf("that URL name is reserved, choose another")
	}
	if strings.HasPrefix(normalized, "api-") || strings.HasPrefix(normalized, "admin-") {
		return "", fmt.Errorf("that URL name is reserved, choose another")
	}
	return normalized, nil
}

// IsReserved reports whether a normalized slug is blocked.
func IsReserved(normalized string) bool {
	if normalized == "" {
		return true
	}
	if _, blocked := reservedSlugs[normalized]; blocked {
		return true
	}
	return strings.HasPrefix(normalized, "api-") || strings.HasPrefix(normalized, "admin-")
}
