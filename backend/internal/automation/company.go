package automation

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

var companySuffixPattern = regexp.MustCompile(`(?i)[,\s]+(inc\.?|incorporated|ltd\.?|limited|llc|gmbh|corp\.?|corporation|co\.?|company|a\.?s\.?|a\.?ş\.?|plc|sa|s\.?a\.?|bv|ag|kg|kft|pty|llp)$`)

// NormalizeCompanyKey produces a stable key for ban matching.
func NormalizeCompanyKey(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	var b strings.Builder
	prevSpace := false
	for _, r := range name {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(unicode.ToLower(r))
			prevSpace = false
			continue
		}
		if !prevSpace && b.Len() > 0 {
			b.WriteByte(' ')
			prevSpace = true
		}
	}
	key := strings.TrimSpace(b.String())
	for {
		next := companySuffixPattern.ReplaceAllString(key, "")
		next = strings.TrimSpace(next)
		if next == key {
			break
		}
		key = next
	}
	key = strings.TrimSuffix(strings.TrimSpace(key), " a s")
	key = strings.TrimSuffix(strings.TrimSpace(key), " a ş")
	return strings.TrimSpace(key)
}

// CompanyMatchesBan reports whether a job company matches any user ban entry.
func CompanyMatchesBan(company string, bans []*store.AutomationCompanyBanRecord) bool {
	key := NormalizeCompanyKey(company)
	if key == "" {
		return false
	}
	for _, ban := range bans {
		if companyKeysMatch(key, ban.CompanyKey) {
			return true
		}
	}
	return false
}

func companyKeysMatch(a, b string) bool {
	a = strings.TrimSpace(a)
	b = strings.TrimSpace(b)
	if a == "" || b == "" {
		return false
	}
	if a == b {
		return true
	}
	return strings.Contains(a, b) || strings.Contains(b, a)
}

// FilterBannedJobCards removes jobs from banned companies.
func FilterBannedJobCards(jobs []linkedin.JobCard, bans []*store.AutomationCompanyBanRecord) []linkedin.JobCard {
	if len(bans) == 0 {
		return jobs
	}
	out := make([]linkedin.JobCard, 0, len(jobs))
	for _, job := range jobs {
		if !CompanyMatchesBan(job.Company, bans) {
			out = append(out, job)
		}
	}
	return out
}
