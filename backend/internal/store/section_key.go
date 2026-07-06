package store

import (
	"strings"
	"unicode"
)

const maxSectionCustomKeyLen = 80

// sectionCustomKey derives a stable workspace key for a CUSTOM section title.
func sectionCustomKey(title string) string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return "section"
	}

	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(trimmed) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash && b.Len() > 0 {
			b.WriteByte('-')
			lastDash = true
		}
	}

	key := strings.Trim(b.String(), "-")
	if key == "" {
		key = "section"
	}
	if len(key) > maxSectionCustomKeyLen {
		key = strings.TrimRight(key[:maxSectionCustomKeyLen], "-")
	}
	return key
}
