package storage

import "testing"

func TestProfileObjectKey(t *testing.T) {
	key := ProfileObjectKey("ws-1", "user-1", ".jpg")
	prefix := ProfileKeyPrefix("ws-1", "user-1")
	if !stringsHasPrefix(key, prefix) {
		t.Fatalf("expected key %q to start with %q", key, prefix)
	}
}

func TestNormalizeProfilePhotoContentType(t *testing.T) {
	ct, err := NormalizeProfilePhotoContentType("image/png; charset=binary")
	if err != nil || ct != "image/png" {
		t.Fatalf("expected image/png, got %q err=%v", ct, err)
	}
	if _, err := NormalizeProfilePhotoContentType("image/gif"); err == nil {
		t.Fatal("expected gif to be rejected")
	}
}

func TestBuildPublicObjectURL(t *testing.T) {
	got := BuildPublicObjectURL("https://cdn.example.com", "bucket", "eu-west-1", "workspaces/ws/profiles/u/a.jpg")
	want := "https://cdn.example.com/workspaces/ws/profiles/u/a.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}

	got = BuildPublicObjectURL("", "bucket", "eu-west-1", "workspaces/ws/profiles/u/a.jpg")
	want = "https://bucket.s3.eu-west-1.amazonaws.com/workspaces/ws/profiles/u/a.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestBuildAzureBlobURL(t *testing.T) {
	got := BuildAzureBlobURL("account", "photos", "https://cdn.example.com", "workspaces/ws/profiles/u/a.jpg")
	want := "https://cdn.example.com/workspaces/ws/profiles/u/a.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}

	got = BuildAzureBlobURL("account", "photos", "", "workspaces/ws/profiles/u/a.jpg")
	want = "https://account.blob.core.windows.net/photos/workspaces/ws/profiles/u/a.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestPhotoURLMatchesAzureScope(t *testing.T) {
	workspaceID := "ws-1"
	userID := "user-1"
	key := ProfileObjectKey(workspaceID, userID, ".webp")
	url := BuildAzureBlobURL("yuseprofilephotos", "profile-photos", "", key)

	if !PhotoURLMatchesAzureScope(url, "", "yuseprofilephotos", "profile-photos", workspaceID, userID) {
		t.Fatal("expected scoped URL to match")
	}
	if PhotoURLMatchesAzureScope("https://yuseprofilephotos.blob.core.windows.net/profile-photos/workspaces/other/profiles/user-1/x.webp", "", "yuseprofilephotos", "profile-photos", workspaceID, userID) {
		t.Fatal("expected foreign workspace URL to fail")
	}
}

func TestPhotoURLMatchesScope(t *testing.T) {
	workspaceID := "ws-1"
	userID := "user-1"
	key := ProfileObjectKey(workspaceID, userID, ".webp")
	url := BuildPublicObjectURL("https://cdn.example.com", "bucket", "eu-west-1", key)

	if !PhotoURLMatchesScope(url, "https://cdn.example.com", "bucket", "eu-west-1", workspaceID, userID) {
		t.Fatal("expected scoped URL to match")
	}
	if PhotoURLMatchesScope("https://cdn.example.com/workspaces/other/profiles/user-1/x.webp", "https://cdn.example.com", "bucket", "eu-west-1", workspaceID, userID) {
		t.Fatal("expected foreign workspace URL to fail")
	}
}

func stringsHasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
