package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
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
	StorageProvider            string
	AWSRegion                  string
	AWSAccessKeyID             string
	AWSSecretAccessKey         string
	AWSS3Bucket                string
	AWSS3PublicURLPrefix       string
	AzureStorageAccount        string
	AzureStorageAccountKey     string
	AzureStorageContainer      string
	AzureStoragePublicURLPrefix string
	EnableGraphQLPlayground    bool
	EmailVerificationRequired  bool
	AdminEmails                []string
	RateLimitLoginPerIP        int
	RateLimitLoginWindow       time.Duration
	RateLimitRegisterPerIP     int
	RateLimitRegisterWindow    time.Duration
	RateLimitGraphQLPerIP      int
	RateLimitGraphQLWindow     time.Duration
	RateLimitAssistantPerUser  int
	RateLimitAssistantWindow   time.Duration
	RateLimitAccountPerUser    int
	RateLimitAccountWindow     time.Duration
	BetaInviteOnly             bool
	RateLimitWaitlistPerIP     int
	RateLimitWaitlistWindow    time.Duration
	RateLimitAccessCheckPerIP  int
	RateLimitAccessCheckWindow time.Duration
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
		StorageProvider:             strings.TrimSpace(os.Getenv("STORAGE_PROVIDER")),
		AWSRegion:                   strings.TrimSpace(os.Getenv("AWS_REGION")),
		AWSAccessKeyID:              strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID")),
		AWSSecretAccessKey:          strings.TrimSpace(os.Getenv("AWS_SECRET_ACCESS_KEY")),
		AWSS3Bucket:                 strings.TrimSpace(os.Getenv("AWS_S3_BUCKET")),
		AWSS3PublicURLPrefix:        strings.TrimSpace(os.Getenv("AWS_S3_PUBLIC_URL_PREFIX")),
		AzureStorageAccount:         strings.TrimSpace(os.Getenv("AZURE_STORAGE_ACCOUNT")),
		AzureStorageAccountKey:      strings.TrimSpace(os.Getenv("AZURE_STORAGE_ACCOUNT_KEY")),
		AzureStorageContainer:       envOr("AZURE_STORAGE_CONTAINER", "profile-photos"),
		AzureStoragePublicURLPrefix: strings.TrimSpace(os.Getenv("AZURE_STORAGE_PUBLIC_URL_PREFIX")),
		EnableGraphQLPlayground:     envBool("ENABLE_GRAPHQL_PLAYGROUND", false),
		EmailVerificationRequired:   envBool("EMAIL_VERIFICATION_REQUIRED", false),
		AdminEmails:                 parseCSV(os.Getenv("ADMIN_EMAILS")),
		RateLimitLoginPerIP:         envInt("RATE_LIMIT_LOGIN_PER_IP", 10),
		RateLimitLoginWindow:        envDuration("RATE_LIMIT_LOGIN_WINDOW", 15*time.Minute),
		RateLimitRegisterPerIP:      envInt("RATE_LIMIT_REGISTER_PER_IP", 5),
		RateLimitRegisterWindow:     envDuration("RATE_LIMIT_REGISTER_WINDOW", time.Hour),
		RateLimitGraphQLPerIP:       envInt("RATE_LIMIT_GRAPHQL_PER_IP", 120),
		RateLimitGraphQLWindow:      envDuration("RATE_LIMIT_GRAPHQL_WINDOW", time.Minute),
		RateLimitAssistantPerUser:   envInt("RATE_LIMIT_ASSISTANT_PER_USER", 20),
		RateLimitAssistantWindow:    envDuration("RATE_LIMIT_ASSISTANT_WINDOW", time.Minute),
		RateLimitAccountPerUser:     envInt("RATE_LIMIT_ACCOUNT_PER_USER", 5),
		RateLimitAccountWindow:      envDuration("RATE_LIMIT_ACCOUNT_WINDOW", 15*time.Minute),
		BetaInviteOnly:              envBool("BETA_INVITE_ONLY", false),
		RateLimitWaitlistPerIP:      envInt("RATE_LIMIT_WAITLIST_PER_IP", 10),
		RateLimitWaitlistWindow:     envDuration("RATE_LIMIT_WAITLIST_WINDOW", time.Hour),
		RateLimitAccessCheckPerIP:   envInt("RATE_LIMIT_ACCESS_CHECK_PER_IP", 5),
		RateLimitAccessCheckWindow: envDuration("RATE_LIMIT_ACCESS_CHECK_WINDOW", 15*time.Minute),
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

// HasAzure reports whether Azure Blob profile photo upload is configured.
func (c Config) HasAzure() bool {
	return c.AzureStorageAccount != "" &&
		c.AzureStorageAccountKey != "" &&
		c.AzureStorageContainer != ""
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

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.ToLower(strings.TrimSpace(part))
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
