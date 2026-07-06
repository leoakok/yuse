package linkedin

import "strings"

// SearchParams are ephemeral admin test inputs for a single Voyager job search.
type SearchParams struct {
	Keywords         string
	GeoID            string
	TimeFilter       string
	WorkplaceTypes   []string
	ExperienceLevels []string
	EmploymentTypes  []string
	SessionCookie    string
}

func linkedInWorkplaceCode(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "REMOTE", "2":
		return "2"
	case "HYBRID", "3":
		return "3"
	case "ON_SITE", "ONSITE", "ON-SITE", "1":
		return "1"
	default:
		return ""
	}
}

func linkedInExperienceCode(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "INTERNSHIP", "1":
		return "1"
	case "ENTRY", "ENTRY_LEVEL", "2":
		return "2"
	case "ASSOCIATE", "3":
		return "3"
	case "MID_SENIOR", "MID-SENIOR", "4":
		return "4"
	case "DIRECTOR", "5":
		return "5"
	case "EXECUTIVE", "6":
		return "6"
	default:
		return ""
	}
}

func linkedInEmploymentCode(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "FULL_TIME", "FULL-TIME", "F":
		return "F"
	case "PART_TIME", "PART-TIME", "P":
		return "P"
	case "CONTRACT", "C":
		return "C"
	case "TEMPORARY", "T":
		return "T"
	case "INTERNSHIP", "I":
		return "I"
	case "VOLUNTEER", "V":
		return "V"
	default:
		return ""
	}
}

func linkedInWorkplaceCodes(values []string) []string {
	return uniqueCodes(values, linkedInWorkplaceCode)
}

func linkedInExperienceCodes(values []string) []string {
	return uniqueCodes(values, linkedInExperienceCode)
}

func linkedInEmploymentCodes(values []string) []string {
	return uniqueCodes(values, linkedInEmploymentCode)
}

func uniqueCodes(values []string, mapCode func(string) string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		if code := mapCode(value); code != "" {
			if _, ok := seen[code]; ok {
				continue
			}
			seen[code] = struct{}{}
			out = append(out, code)
		}
	}
	return out
}

func restliList(codes []string) string {
	if len(codes) == 0 {
		return ""
	}
	return "List(" + strings.Join(codes, ",") + ")"
}

func parseWorkplaceAndLocation(secondary string) (location, workplace string) {
	secondary = strings.TrimSpace(secondary)
	if secondary == "" {
		return "", ""
	}
	if before, after, ok := strings.Cut(secondary, "("); ok {
		workplace = strings.TrimSpace(strings.TrimSuffix(after, ")"))
		location = strings.TrimSpace(strings.TrimSuffix(before, ","))
		return location, workplace
	}
	return secondary, ""
}

func hasSearchCriteria(params SearchParams) bool {
	if strings.TrimSpace(params.Keywords) != "" {
		return true
	}
	if strings.TrimSpace(params.GeoID) != "" {
		return true
	}
	if len(params.WorkplaceTypes) > 0 || len(params.ExperienceLevels) > 0 || len(params.EmploymentTypes) > 0 {
		return true
	}
	return false
}
