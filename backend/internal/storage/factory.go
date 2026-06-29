package storage

import (
	"fmt"
	"strings"

	appconfig "github.com/leo/ai-weekend/backend/internal/config"
)

// NewProfilePhotoUploader selects S3 or Azure based on STORAGE_PROVIDER or configured credentials.
func NewProfilePhotoUploader(cfg appconfig.Config) (ProfilePhotoUploader, error) {
	provider := strings.ToLower(strings.TrimSpace(cfg.StorageProvider))
	switch provider {
	case "":
		switch {
		case cfg.HasAzure():
			provider = "azure"
		case cfg.HasAWS():
			provider = "s3"
		default:
			return nil, nil
		}
	case "azure":
		if !cfg.HasAzure() {
			return nil, fmt.Errorf("STORAGE_PROVIDER=azure but Azure Blob Storage is not configured")
		}
	case "s3", "aws":
		if !cfg.HasAWS() {
			return nil, fmt.Errorf("STORAGE_PROVIDER=%s but AWS S3 is not configured", provider)
		}
	default:
		return nil, fmt.Errorf("unsupported STORAGE_PROVIDER: %s", provider)
	}

	switch provider {
	case "azure":
		return NewAzureProfilePhotoUploader(cfg)
	case "s3", "aws":
		return NewS3ProfilePhotoUploader(cfg)
	default:
		return nil, nil
	}
}
