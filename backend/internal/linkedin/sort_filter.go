package linkedin

import "fmt"

const (
	sortByDateDesc    = "DD"
	sortByRelevance   = "R"
	defaultMaxResults = 350
	maxMaxResults     = 350
)

// NormalizeSortBy maps admin sort inputs to LinkedIn Voyager sort codes.
func NormalizeSortBy(value string) (string, error) {
	switch value {
	case "", "DD", "DATE_DESC":
		return sortByDateDesc, nil
	case "R", "RELEVANCE":
		return sortByRelevance, nil
	default:
		return "", fmt.Errorf("unsupported sortBy %q", value)
	}
}

func normalizeMaxResults(value int) int {
	if value <= 0 {
		return defaultMaxResults
	}
	if value > maxMaxResults {
		return maxMaxResults
	}
	return value
}
