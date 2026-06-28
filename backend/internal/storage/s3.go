package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	appconfig "github.com/leo/ai-weekend/backend/internal/config"
)

// ProfilePhotoUploader issues presigned profile photo uploads and validates saved URLs.
type ProfilePhotoUploader interface {
	RequestUpload(ctx context.Context, workspaceID, userID, contentType, fileName string) (*UploadRequest, error)
	ValidatePhotoURL(ctx context.Context, workspaceID, userID, photoURL string) error
}

type S3ProfilePhotoUploader struct {
	client       *s3.Client
	presigner    *s3.PresignClient
	bucket       string
	region       string
	publicPrefix string
}

func NewS3ProfilePhotoUploader(cfg appconfig.Config) (ProfilePhotoUploader, error) {
	if !cfg.HasAWS() {
		return nil, fmt.Errorf("AWS S3 is not configured")
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(cfg.AWSRegion),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AWSAccessKeyID,
			cfg.AWSSecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)
	return &S3ProfilePhotoUploader{
		client:       client,
		presigner:    s3.NewPresignClient(client),
		bucket:       cfg.AWSS3Bucket,
		region:       cfg.AWSRegion,
		publicPrefix: cfg.AWSS3PublicURLPrefix,
	}, nil
}

func (u *S3ProfilePhotoUploader) RequestUpload(
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
	presigned, err := u.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucket),
		Key:         aws.String(objectKey),
		ContentType: aws.String(ct),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return nil, fmt.Errorf("presign upload: %w", err)
	}

	return &UploadRequest{
		UploadURL:   presigned.URL,
		PhotoURL:    BuildPublicObjectURL(u.publicPrefix, u.bucket, u.region, objectKey),
		ContentType: ct,
		MaxBytes:    MaxProfilePhotoBytes,
		ObjectKey:   objectKey,
	}, nil
}

func (u *S3ProfilePhotoUploader) ValidatePhotoURL(
	ctx context.Context,
	workspaceID, userID, photoURL string,
) error {
	trimmed := strings.TrimSpace(photoURL)
	if trimmed == "" {
		return nil
	}
	if !PhotoURLMatchesScope(trimmed, u.publicPrefix, u.bucket, u.region, workspaceID, userID) {
		return fmt.Errorf("photo URL is not allowed for this workspace")
	}

	objectKey, err := objectKeyFromPhotoURL(trimmed, u.publicPrefix, u.bucket, u.region)
	if err != nil {
		return err
	}

	head, err := u.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(u.bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		return fmt.Errorf("photo not found in storage")
	}
	if head.ContentLength != nil && *head.ContentLength > MaxProfilePhotoBytes {
		return fmt.Errorf("photo exceeds maximum size")
	}
	if head.ContentType != nil {
		if _, err := NormalizeProfilePhotoContentType(*head.ContentType); err != nil {
			return fmt.Errorf("photo has unsupported content type")
		}
	}
	return nil
}

func objectKeyFromPhotoURL(photoURL, publicPrefix, bucket, region string) (string, error) {
	if prefix := strings.TrimRight(strings.TrimSpace(publicPrefix), "/"); prefix != "" {
		if !strings.HasPrefix(photoURL, prefix+"/") {
			return "", fmt.Errorf("photo URL is not allowed for this workspace")
		}
		return strings.TrimPrefix(photoURL, prefix+"/"), nil
	}

	bucketHost := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/", bucket, region)
	if strings.HasPrefix(photoURL, bucketHost) {
		return strings.TrimPrefix(photoURL, bucketHost), nil
	}
	altHost := fmt.Sprintf("https://s3.%s.amazonaws.com/%s/", region, bucket)
	if strings.HasPrefix(photoURL, altHost) {
		return strings.TrimPrefix(photoURL, altHost), nil
	}
	return "", fmt.Errorf("photo URL is not allowed for this workspace")
}
