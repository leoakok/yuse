package auth

import (
	"fmt"
	"strings"
)

// Claims are embedded in the Bearer JWT issued by the Next.js GraphQL proxy.
type Claims struct {
	Sub       string
	Email     string
	Name      string
	Picture   string
	GoogleID  string
	Bootstrap bool // true only on the first API call after OAuth sign-in
}

func UserIDFromGoogleSub(googleID string) string {
	return "google-" + googleID
}

func UserIDFromEmailAccount(accountID string) string {
	return "email-" + accountID
}

func WorkspaceIDForUser(userID string) string {
	switch {
	case strings.HasPrefix(userID, "google-"):
		return "ws-" + strings.TrimPrefix(userID, "google-")
	case strings.HasPrefix(userID, "email-"):
		return "ws-" + strings.TrimPrefix(userID, "email-")
	default:
		return "ws-" + userID
	}
}

func (c Claims) UserID() string {
	if c.Sub != "" {
		return c.Sub
	}
	return UserIDFromGoogleSub(c.GoogleID)
}

func (c Claims) Validate() error {
	if strings.TrimSpace(c.Sub) == "" && strings.TrimSpace(c.GoogleID) == "" {
		return fmt.Errorf("missing subject")
	}
	if strings.TrimSpace(c.Email) == "" {
		return fmt.Errorf("missing email")
	}
	if strings.TrimSpace(c.Name) == "" {
		return fmt.Errorf("missing name")
	}
	return nil
}
