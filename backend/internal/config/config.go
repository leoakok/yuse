package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	OpenAIAPIKey           string
	OpenAIMiniModel        string
	OpenAIFallbackModel    string
	OpenAIVisionModel      string
	CORSOrigin             string
	AuthSecret             string
	GitHubClientID         string
	GitHubClientSecret     string
	GitHubOAuthCallbackURL string
	AWSRegion              string
	AWSAccessKeyID         string
	AWSSecretAccessKey     string
	AWSS3Bucket            string
	AWSS3PublicURLPrefix   string
}

func Load() (Config, error) {
	cfg := Config{
		Port:                envOr("PORT", "8080"),
		DatabaseURL:         strings.TrimSpace(os.Getenv("DATABASE_URL")),
		OpenAIAPIKey:        strings.TrimSpace(os.Getenv("OPENAI_API_KEY")),
		OpenAIMiniModel:     envOr("OPENAI_MINI_MODEL", "gpt-5.4-mini"),
		OpenAIFallbackModel: envOr("OPENAI_FALLBACK_MODEL", "gpt-4o-mini"),
		OpenAIVisionModel:   envOr("OPENAI_VISION_MODEL", "gpt-4o"),
		CORSOrigin:             envOr("CORS_ORIGIN", "http://localhost:3000"),
		AuthSecret:             strings.TrimSpace(os.Getenv("AUTH_SECRET")),
		GitHubClientID:         strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID")),
		GitHubClientSecret:     strings.TrimSpace(os.Getenv("GITHUB_CLIENT_SECRET")),
		GitHubOAuthCallbackURL: strings.TrimSpace(os.Getenv("GITHUB_OAUTH_CALLBACK_URL")),
		AWSRegion:              strings.TrimSpace(os.Getenv("AWS_REGION")),
		AWSAccessKeyID:         strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID")),
		AWSSecretAccessKey:     strings.TrimSpace(os.Getenv("AWS_SECRET_ACCESS_KEY")),
		AWSS3Bucket:            strings.TrimSpace(os.Getenv("AWS_S3_BUCKET")),
		AWSS3PublicURLPrefix:   strings.TrimSpace(os.Getenv("AWS_S3_PUBLIC_URL_PREFIX")),
	}

	if cfg.GitHubOAuthCallbackURL == "" {
		cfg.GitHubOAuthCallbackURL = strings.TrimRight(cfg.CORSOrigin, "/") + "/api/auth/github/callback"
	}

	return cfg, nil
}

// HasGitHubOAuth reports whether GitHub OAuth connect is configured.
func (c Config) HasGitHubOAuth() bool {
	return c.GitHubClientID != "" && c.GitHubClientSecret != ""
}

// HasAWS reports whether S3 profile photo upload is configured.
func (c Config) HasAWS() bool {
	return c.AWSRegion != "" &&
		c.AWSAccessKeyID != "" &&
		c.AWSSecretAccessKey != "" &&
		c.AWSS3Bucket != ""
}

// ValidateBootstrap ensures persistence can start.
func (c Config) ValidateBootstrap() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	return nil
}

// ValidateServer ensures the GraphQL API can authenticate requests.
func (c Config) ValidateServer() error {
	if err := c.ValidateBootstrap(); err != nil {
		return err
	}
	if c.AuthSecret == "" {
		return fmt.Errorf("AUTH_SECRET is required")
	}
	return nil
}

// HasOpenAIKey reports whether a real OpenAI API key is configured.
func (c Config) HasOpenAIKey() bool {
	key := strings.TrimSpace(c.OpenAIAPIKey)
	return key != "" && !strings.Contains(key, "your-key")
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
