package linkedin

import "strings"

// IsSessionError reports whether an error indicates the LinkedIn session expired or was rejected.
func IsSessionError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "session expired") ||
		strings.Contains(msg, "redirected to login") ||
		strings.Contains(msg, "http 401")
}
