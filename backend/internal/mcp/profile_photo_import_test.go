package mcp

import "testing"

func TestExtractLinkedInProfilePhotoURL(t *testing.T) {
	profile := map[string]any{
		"profilePicture": map[string]any{
			"url": "https://media.licdn.com/dms/image/photo.jpg",
		},
	}
	if got := extractLinkedInProfilePhotoURL(profile); got == "" {
		t.Fatal("expected linkedin photo url")
	}

	profile = map[string]any{"photoUrl": "https://media.licdn.com/avatar.png"}
	if got := extractLinkedInProfilePhotoURL(profile); got != "https://media.licdn.com/avatar.png" {
		t.Fatalf("unexpected url %q", got)
	}
}

func TestExtractGitHubProfilePhotoURL(t *testing.T) {
	profile := map[string]any{
		"avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
	}
	if got := extractGitHubProfilePhotoURL(profile); got == "" {
		t.Fatal("expected github avatar url")
	}
}

func TestEnrichImportProfileResults(t *testing.T) {
	li := map[string]any{
		"profile": map[string]any{"photoUrl": "https://media.licdn.com/me.jpg"},
	}
	enrichLinkedInProfileResult(li)
	if li["linkedinPhotoUrl"] != "https://media.licdn.com/me.jpg" {
		t.Fatalf("unexpected linkedin result %#v", li["linkedinPhotoUrl"])
	}

	gh := map[string]any{
		"profile": map[string]any{"avatar_url": "https://avatars.githubusercontent.com/u/2"},
	}
	enrichGitHubProfileResult(gh)
	if gh["githubPhotoUrl"] != "https://avatars.githubusercontent.com/u/2" {
		t.Fatalf("unexpected github result %#v", gh["githubPhotoUrl"])
	}
}
