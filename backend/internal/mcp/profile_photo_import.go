package mcp

import (
	"strings"
)

func enrichLinkedInProfileResult(result map[string]any) {
	if result == nil {
		return
	}
	profile, _ := result["profile"].(map[string]any)
	if url := extractLinkedInProfilePhotoURL(profile); url != "" {
		result["linkedinPhotoUrl"] = url
	}
}

func enrichGitHubProfileResult(result map[string]any) {
	if result == nil {
		return
	}
	profile, _ := result["profile"].(map[string]any)
	if url := extractGitHubProfilePhotoURL(profile); url != "" {
		result["githubPhotoUrl"] = url
	}
}

func extractLinkedInProfilePhotoURL(profile map[string]any) string {
	if profile == nil {
		return ""
	}
	for _, key := range []string{
		"profilePicture", "profile_picture", "photoUrl", "photo_url",
		"picture", "avatar", "image", "profileImage", "profile_image",
		"photo", "avatarUrl", "avatar_url",
	} {
		if url := profilePhotoURLFromValue(profile[key]); url != "" {
			return url
		}
	}
	for _, nestKey := range []string{"profilePicture", "picture", "photo", "avatar"} {
		nested, ok := profile[nestKey].(map[string]any)
		if !ok {
			continue
		}
		for _, urlKey := range []string{"url", "displayImage", "rootUrl", "src"} {
			if url := profilePhotoURLFromValue(nested[urlKey]); url != "" {
				return url
			}
		}
	}
	return ""
}

func extractGitHubProfilePhotoURL(profile map[string]any) string {
	if profile == nil {
		return ""
	}
	return profilePhotoURLFromValue(profile["avatar_url"])
}

func profilePhotoURLFromValue(v any) string {
	switch typed := v.(type) {
	case string:
		return normalizeProfilePhotoURL(typed)
	case map[string]any:
		for _, key := range []string{"url", "src", "rootUrl", "displayImage"} {
			if url := profilePhotoURLFromValue(typed[key]); url != "" {
				return url
			}
		}
	}
	return ""
}

func normalizeProfilePhotoURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	if !strings.HasPrefix(lower, "https://") && !strings.HasPrefix(lower, "http://") {
		return ""
	}
	return raw
}
