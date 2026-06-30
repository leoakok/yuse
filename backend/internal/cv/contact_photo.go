package cv

import (
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// EffectiveContactPhotoURL returns the first non-empty photo URL in priority order:
// uploaded photoUrl, then linkedinPhotoUrl, then githubPhotoUrl.
func EffectiveContactPhotoURL(cp *model.ContactProfile) *string {
	if cp == nil {
		return nil
	}
	for _, candidate := range []*string{cp.PhotoURL, cp.LinkedinPhotoURL, cp.GithubPhotoURL} {
		if candidate == nil {
			continue
		}
		if trimmed := strings.TrimSpace(*candidate); trimmed != "" {
			return &trimmed
		}
	}
	return nil
}
