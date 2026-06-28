package storage

import (
	"fmt"
	"path"
	"strings"

	"github.com/google/uuid"
)

const MaxProfilePhotoBytes int64 = 5 * 1024 * 1024

var allowedProfilePhotoContentTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadRequest describes a presigned profile photo upload.
type UploadRequest struct {
	UploadURL   string
	PhotoURL    string
	ContentType string
	MaxBytes    int64
	ObjectKey   string
}

// NormalizeProfilePhotoContentType validates and returns a canonical content type.
func NormalizeProfilePhotoContentType(contentType string) (string, error) {
	ct := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if _, ok := allowedProfilePhotoContentTypes[ct]; ok {
		return ct, nil
	}
	return "", fmt.Errorf("unsupported image type: use JPEG, PNG, or WebP")
}

// ExtensionForContentType returns the file extension for a validated content type.
func ExtensionForContentType(contentType string) (string, error) {
	ct, err := NormalizeProfilePhotoContentType(contentType)
	if err != nil {
		return "", err
	}
	return allowedProfilePhotoContentTypes[ct], nil
}

// ProfileObjectKey builds the S3 object key for a profile photo.
func ProfileObjectKey(workspaceID, userID, ext string) string {
	id := uuid.NewString()
	return path.Join("workspaces", workspaceID, "profiles", userID, id+ext)
}

// ProfileKeyPrefix returns the allowed key prefix for a user's profile photos.
func ProfileKeyPrefix(workspaceID, userID string) string {
	return path.Join("workspaces", workspaceID, "profiles", userID) + "/"
}

// BuildPublicObjectURL returns the public URL for an uploaded object.
func BuildPublicObjectURL(publicPrefix, bucket, region, objectKey string) string {
	if prefix := strings.TrimRight(strings.TrimSpace(publicPrefix), "/"); prefix != "" {
		return prefix + "/" + objectKey
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucket, region, objectKey)
}

// PhotoURLMatchesScope checks that a photo URL belongs to the expected workspace/user prefix.
func PhotoURLMatchesScope(photoURL, publicPrefix, bucket, region, workspaceID, userID string) bool {
	trimmed := strings.TrimSpace(photoURL)
	if trimmed == "" {
		return false
	}
	expectedPrefix := ProfileKeyPrefix(workspaceID, userID)
	if prefix := strings.TrimRight(strings.TrimSpace(publicPrefix), "/"); prefix != "" {
		return strings.Contains(trimmed, expectedPrefix) && strings.HasPrefix(trimmed, prefix+"/")
	}
	bucketHost := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/", bucket, region)
	if strings.HasPrefix(trimmed, bucketHost) {
		return strings.HasPrefix(strings.TrimPrefix(trimmed, bucketHost), expectedPrefix)
	}
	altHost := fmt.Sprintf("https://s3.%s.amazonaws.com/%s/", region, bucket)
	if strings.HasPrefix(trimmed, altHost) {
		return strings.HasPrefix(strings.TrimPrefix(trimmed, altHost), expectedPrefix)
	}
	return strings.Contains(trimmed, expectedPrefix)
}
