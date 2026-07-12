package linkedin

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// NormalizeTimeFilter converts user input to LinkedIn f_TPR / timePostedRange form (r{seconds}).
// Accepts presets like r86400, bare seconds like 900, or shorthand like 15m, 1h, 2d.
func NormalizeTimeFilter(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return defaultTimeFilter, nil
	}

	lower := strings.ToLower(raw)
	if strings.HasSuffix(lower, "m") || strings.HasSuffix(lower, "h") || strings.HasSuffix(lower, "d") || strings.HasSuffix(lower, "s") {
		seconds, err := parseDurationShorthand(lower)
		if err != nil {
			return "", err
		}
		return formatTimeFilter(seconds)
	}

	digits := strings.TrimPrefix(lower, "r")
	if digits == "" || !regexp.MustCompile(`^\d+$`).MatchString(digits) {
		return "", fmt.Errorf("invalid time filter %q; use r900, 15m, 1h, or seconds", raw)
	}

	seconds, err := strconv.Atoi(digits)
	if err != nil || seconds <= 0 {
		return "", fmt.Errorf("invalid time filter %q", raw)
	}
	return formatTimeFilter(seconds)
}

func parseDurationShorthand(raw string) (int, error) {
	unit := raw[len(raw)-1]
	valueStr := strings.TrimSpace(raw[:len(raw)-1])
	value, err := strconv.Atoi(valueStr)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("invalid time filter %q", raw)
	}
	switch unit {
	case 's':
		return value, nil
	case 'm':
		return value * 60, nil
	case 'h':
		return value * 3600, nil
	case 'd':
		return value * 86400, nil
	default:
		return 0, fmt.Errorf("invalid time filter %q", raw)
	}
}

func formatTimeFilter(seconds int) (string, error) {
	if seconds <= 0 {
		return "", fmt.Errorf("time filter must be positive")
	}
	if seconds > 2592000 {
		return "", fmt.Errorf("time filter cannot exceed 30 days")
	}
	return "r" + strconv.Itoa(seconds), nil
}
