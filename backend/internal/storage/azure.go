package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
	appconfig "github.com/leo/ai-weekend/backend/internal/config"
)

type AzureProfilePhotoUploader struct {
	client       *azblob.Client
	credential   *azblob.SharedKeyCredential
	accountName  string
	container    string
	publicPrefix string
}

func NewAzureProfilePhotoUploader(cfg appconfig.Config) (ProfilePhotoUploader, error) {
	if !cfg.HasAzure() {
		return nil, fmt.Errorf("Azure Blob Storage is not configured")
	}

	credential, err := azblob.NewSharedKeyCredential(cfg.AzureStorageAccount, cfg.AzureStorageAccountKey)
	if err != nil {
		return nil, fmt.Errorf("azure credentials: %w", err)
	}

	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", cfg.AzureStorageAccount)
	client, err := azblob.NewClientWithSharedKeyCredential(serviceURL, credential, nil)
	if err != nil {
		return nil, fmt.Errorf("azure blob client: %w", err)
	}

	return &AzureProfilePhotoUploader{
		client:       client,
		credential:   credential,
		accountName:  cfg.AzureStorageAccount,
		container:    cfg.AzureStorageContainer,
		publicPrefix: cfg.AzureStoragePublicURLPrefix,
	}, nil
}

func (u *AzureProfilePhotoUploader) RequestUpload(
	ctx context.Context,
	workspaceID, userID, contentType, _ string,
) (*UploadRequest, error) {
	ct, err := NormalizeProfilePhotoContentType(contentType)
	if err != nil {
		return nil, err
	}
	ext, err := ExtensionForContentType(ct)
	if err != nil {
		return nil, err
	}

	objectKey := ProfileObjectKey(workspaceID, userID, ext)
	uploadURL, err := u.presignedUploadURL(objectKey, ct)
	if err != nil {
		return nil, err
	}

	return &UploadRequest{
		UploadURL:   uploadURL,
		PhotoURL:    BuildAzureBlobURL(u.accountName, u.container, u.publicPrefix, objectKey),
		ContentType: ct,
		MaxBytes:    MaxProfilePhotoBytes,
		ObjectKey:   objectKey,
	}, nil
}

func (u *AzureProfilePhotoUploader) ValidatePhotoURL(
	ctx context.Context,
	workspaceID, userID, photoURL string,
) error {
	trimmed := strings.TrimSpace(photoURL)
	if trimmed == "" {
		return nil
	}
	if !PhotoURLMatchesAzureScope(trimmed, u.publicPrefix, u.accountName, u.container, workspaceID, userID) {
		return fmt.Errorf("photo URL is not allowed for this workspace")
	}

	objectKey, err := objectKeyFromAzurePhotoURL(trimmed, u.publicPrefix, u.accountName, u.container)
	if err != nil {
		return err
	}

	blobClient := u.client.ServiceClient().NewContainerClient(u.container).NewBlobClient(objectKey)
	props, err := blobClient.GetProperties(ctx, nil)
	if err != nil {
		return fmt.Errorf("photo not found in storage")
	}
	if props.ContentLength != nil && *props.ContentLength > MaxProfilePhotoBytes {
		return fmt.Errorf("photo exceeds maximum size")
	}
	if props.ContentType != nil {
		if _, err := NormalizeProfilePhotoContentType(*props.ContentType); err != nil {
			return fmt.Errorf("photo has unsupported content type")
		}
	}
	return nil
}

func (u *AzureProfilePhotoUploader) presignedUploadURL(objectKey, contentType string) (string, error) {
	now := time.Now().UTC()
	permissions := sas.BlobPermissions{Write: true, Create: true}
	sasValues := sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     now.Add(-5 * time.Minute),
		ExpiryTime:    now.Add(15 * time.Minute),
		ContainerName: u.container,
		BlobName:      objectKey,
		Permissions:   permissions.String(),
		ContentType:   contentType,
	}

	query, err := sasValues.SignWithSharedKey(u.credential)
	if err != nil {
		return "", fmt.Errorf("sign upload url: %w", err)
	}

	blobURL := BuildAzureBlobURL(u.accountName, u.container, "", objectKey)
	return fmt.Sprintf("%s?%s", blobURL, query.Encode()), nil
}

func objectKeyFromAzurePhotoURL(photoURL, publicPrefix, accountName, container string) (string, error) {
	if prefix := strings.TrimRight(strings.TrimSpace(publicPrefix), "/"); prefix != "" {
		if !strings.HasPrefix(photoURL, prefix+"/") {
			return "", fmt.Errorf("photo URL is not allowed for this workspace")
		}
		return strings.TrimPrefix(photoURL, prefix+"/"), nil
	}

	blobHost := AzureBlobURLHost(accountName, container)
	if strings.HasPrefix(photoURL, blobHost) {
		return strings.TrimPrefix(photoURL, blobHost), nil
	}
	return "", fmt.Errorf("photo URL is not allowed for this workspace")
}
