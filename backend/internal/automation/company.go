package automation

import (
	"github.com/leo/ai-weekend/backend/internal/jobs"
	"github.com/leo/ai-weekend/backend/internal/linkedin"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// NormalizeCompanyKey produces a stable key for ban matching.
func NormalizeCompanyKey(name string) string {
	return jobs.NormalizeCompanyKey(name)
}

// CompanyMatchesBan reports whether a job company matches any user ban entry.
func CompanyMatchesBan(company string, bans []*store.AutomationCompanyBanRecord) bool {
	return jobs.CompanyMatchesBan(company, bans)
}

// FilterBannedJobCards removes jobs from banned companies.
func FilterBannedJobCards(cards []linkedin.JobCard, bans []*store.AutomationCompanyBanRecord) []linkedin.JobCard {
	return jobs.FilterBannedJobCards(cards, bans)
}
