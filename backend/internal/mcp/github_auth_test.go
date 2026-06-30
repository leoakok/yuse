package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestGitHubUserReposAPIURLUsesUserEndpoint(t *testing.T) {
	url := githubUserReposAPIURL(30)
	if !strings.Contains(url, "/user/repos") {
		t.Fatalf("expected /user/repos, got %q", url)
	}
	if strings.Contains(url, "/users/") {
		t.Fatalf("must not use /users/{username}, got %q", url)
	}
	if !strings.Contains(url, "page=1") {
		t.Fatalf("expected page=1 in paginated url, got %q", url)
	}
}

func TestGitHubReposAPIURLUsesPublicUserEndpoint(t *testing.T) {
	url := githubReposAPIURL("octocat")
	if !strings.Contains(url, "/users/octocat/repos") {
		t.Fatalf("unexpected public repos url: %q", url)
	}
}

func TestFilterReposByAllowedOwners(t *testing.T) {
	repos := []map[string]any{
		{"full_name": "leoakok/my-app"},
		{"full_name": "other-org/other-repo"},
		{"full_name": "leoakok/second"},
	}
	allowed := buildAllowedRepoOwners("leoakok", []map[string]any{{"login": "my-org"}})
	filtered := filterReposByAllowedOwners(repos, allowed)
	if len(filtered) != 2 {
		t.Fatalf("expected 2 repos, got %d", len(filtered))
	}
}

func TestFetchAuthenticatedUserReposUsesOAuthToken(t *testing.T) {
	var requestedPath string
	var authHeader string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		authHeader = r.Header.Get("Authorization")
		switch r.URL.Path {
		case "/user/repos":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[{"name":"my-app","full_name":"leoakok/my-app","html_url":"https://github.com/leoakok/my-app","fork":false,"stargazers_count":1}]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("test-oauth-token")
	repos, err := client.FetchAuthenticatedUserRepos(10)
	if err != nil {
		t.Fatalf("FetchAuthenticatedUserRepos: %v", err)
	}
	if requestedPath != "/user/repos" {
		t.Fatalf("expected /user/repos, got %q", requestedPath)
	}
	if authHeader != "Bearer test-oauth-token" {
		t.Fatalf("unexpected auth header: %q", authHeader)
	}
	if len(repos) != 1 {
		t.Fatalf("expected 1 repo, got %d", len(repos))
	}
}

func TestSearchListUserReposSkipsGlobalSearch(t *testing.T) {
	var paths []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.URL.Path)
		switch r.URL.Path {
		case "/user":
			_, _ = w.Write([]byte(`{"login":"leoakok"}`))
		case "/users/leoakok":
			_, _ = w.Write([]byte(`{"login":"leoakok","avatar_url":"https://avatars.githubusercontent.com/u/99"}`))
		case "/user/repos":
			_, _ = w.Write([]byte(`[{"name":"app","full_name":"leoakok/app","html_url":"https://github.com/leoakok/app","fork":false}]`))
		case "/users/leoakok/orgs":
			_, _ = w.Write([]byte(`[]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	result, err := client.Search("", true, 10)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	for _, p := range paths {
		if strings.HasPrefix(p, "/search/") {
			t.Fatalf("global search should not run when listUserRepos=true, paths=%v", paths)
		}
	}
	if result["authenticatedAs"] != "@leoakok" {
		t.Fatalf("expected authenticatedAs, got %v", result["authenticatedAs"])
	}
	importRepos, _ := result["importRepositories"].([]map[string]any)
	if len(importRepos) != 1 {
		t.Fatalf("expected 1 import repo, got %d", len(importRepos))
	}
	if result["githubPhotoUrl"] != "https://avatars.githubusercontent.com/u/99" {
		t.Fatalf("expected githubPhotoUrl, got %v", result["githubPhotoUrl"])
	}
}

type githubTokenExecutor struct {
	token string
}

func (githubTokenExecutor) ListResumes() []*model.Resume { return nil }
func (githubTokenExecutor) GetResume(string) (*model.Resume, error) { return nil, nil }
func (githubTokenExecutor) CreateResume(string) *model.Resume { return nil }
func (githubTokenExecutor) DuplicateResume(string) (*model.Resume, error) { return nil, nil }
func (githubTokenExecutor) DeleteResume(string) (bool, error) { return false, nil }
func (githubTokenExecutor) UpdateResume(string, *string, *string) (*model.Resume, error) {
	return nil, nil
}
func (githubTokenExecutor) GetResumeWithContent(string) (*model.ResumeWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdateContactProfile(_ context.Context, _ model.UpdateContactProfileInput) (*model.ResumeWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) AddResumeSectionItem(model.AddResumeSectionItemInput) (*model.ResumeWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdateResumeSectionItem(model.UpdateResumeSectionItemInput) (*model.ResumeWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdateResumeSectionItemVisibility(model.UpdateResumeSectionItemVisibilityInput) (*model.ResumeWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdateResumeSettings(model.UpdateResumeSettingsInput) (*model.ResumeSettings, error) {
	return nil, nil
}
func (githubTokenExecutor) ListPortfolios() []*model.Portfolio { return nil }
func (githubTokenExecutor) GetPortfolio(string) (*model.Portfolio, error) { return nil, nil }
func (githubTokenExecutor) CreatePortfolio(string) *model.Portfolio { return nil }
func (githubTokenExecutor) DuplicatePortfolio(string) (*model.Portfolio, error) { return nil, nil }
func (githubTokenExecutor) DeletePortfolio(string) (bool, error) { return false, nil }
func (githubTokenExecutor) UpdatePortfolio(string, *string, *string, *string, *string) (*model.Portfolio, error) {
	return nil, nil
}
func (githubTokenExecutor) GetPortfolioWithContent(string) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdatePortfolioContactProfile(_ context.Context, _ model.UpdatePortfolioContactProfileInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) AddPortfolioProject(model.AddPortfolioProjectInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdatePortfolioProject(model.UpdatePortfolioProjectInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) DeletePortfolioProject(string, string) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) SetPortfolioProjectVisibility(model.SetPortfolioProjectVisibilityInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) AddPortfolioSkill(model.AddPortfolioSkillInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdatePortfolioSkill(model.UpdatePortfolioSkillInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) DeletePortfolioSkill(string, string) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) AddPortfolioTestimonial(model.AddPortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdatePortfolioTestimonial(model.UpdatePortfolioTestimonialInput) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) DeletePortfolioTestimonial(string, string) (*model.PortfolioWithContent, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdatePortfolioSettings(model.UpdatePortfolioSettingsInput) (*model.PortfolioSettings, error) {
	return nil, nil
}
func (githubTokenExecutor) ListSections(*model.SectionType) []*model.Section { return nil }
func (githubTokenExecutor) ListCvThemes() []*model.CvTheme { return nil }
func (githubTokenExecutor) ListTwinEntries() []*model.TwinEntry { return nil }
func (githubTokenExecutor) GetTwinEntry(string) (*model.TwinEntry, error) { return nil, nil }
func (githubTokenExecutor) CreateTwinEntry(model.CreateTwinEntryInput) (*model.TwinEntry, error) {
	return nil, nil
}
func (githubTokenExecutor) UpdateTwinEntry(model.UpdateTwinEntryInput) (*model.TwinEntry, error) {
	return nil, nil
}
func (githubTokenExecutor) DeleteTwinEntry(string) (bool, error) { return false, nil }
func (githubTokenExecutor) ListTrackedJobs() []*model.TrackedJob { return nil }
func (githubTokenExecutor) GetTrackedJob(string) (*model.TrackedJob, error) { return nil, nil }
func (githubTokenExecutor) UpdateTrackedJob(model.UpdateTrackedJobInput) (*model.TrackedJob, error) {
	return nil, nil
}
func (e githubTokenExecutor) GitHubAccessToken() string { return e.token }
func (githubTokenExecutor) UserEmail() string { return "" }

func TestSearchGitHubRegistryAllowsEmptyQueryWithConnectedAccount(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/user":
			_, _ = w.Write([]byte(`{"login":"leoakok"}`))
		case "/user/repos":
			_, _ = w.Write([]byte(`[{"name":"top-app","full_name":"leoakok/top-app","html_url":"https://github.com/leoakok/top-app","fork":false,"stargazers_count":12}]`))
		case "/users/leoakok/orgs":
			_, _ = w.Write([]byte(`[]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	registry := NewRegistry(githubTokenExecutor{token: "oauth-token"})
	args, _ := json.Marshal(map[string]any{
		"listUserRepos": true,
		"maxResults":    5,
	})
	exec := registry.Execute("search_github", args)
	if exec.Error != "" {
		t.Fatalf("search_github with empty query: %s", exec.Error)
	}
	if exec.DurationMs < 0 {
		t.Fatalf("expected non-negative duration, got %d", exec.DurationMs)
	}
	raw, _ := json.Marshal(exec.Result)
	text := string(raw)
	if !strings.Contains(text, `"authenticatedAs":"@leoakok"`) {
		t.Fatalf("expected authenticatedAs in result, got %s", text)
	}
	if !strings.Contains(text, `"top-app"`) {
		t.Fatalf("expected repo in result, got %s", text)
	}
}

func TestSearchListUserReposPaginatesBeforeFilter(t *testing.T) {
	page1 := make([]map[string]any, 0, githubUserReposPageSize)
	for i := 0; i < githubUserReposPageSize; i++ {
		page1 = append(page1, map[string]any{
			"name":      fmt.Sprintf("repo-%03d", i),
			"full_name": fmt.Sprintf("leoakok/repo-%03d", i),
			"fork":      false,
		})
	}
	page2 := []map[string]any{
		{"name": "stylette", "full_name": "leoakok/stylette", "description": "CSS tool", "fork": false},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/user":
			_, _ = w.Write([]byte(`{"login":"leoakok"}`))
		case "/user/repos":
			page := r.URL.Query().Get("page")
			if page == "" || page == "1" {
				b, _ := json.Marshal(page1)
				_, _ = w.Write(b)
				return
			}
			b, _ := json.Marshal(page2)
			_, _ = w.Write(b)
		case "/users/leoakok/orgs":
			_, _ = w.Write([]byte(`[]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	result, err := client.Search("stylette", true, 10)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if result["totalRepos"] != githubUserReposPageSize+1 {
		t.Fatalf("expected totalRepos=%d, got %v", githubUserReposPageSize+1, result["totalRepos"])
	}
	if result["matchedCount"] != 1 {
		t.Fatalf("expected matchedCount=1, got %v", result["matchedCount"])
	}
	repos, _ := result["repositories"].([]map[string]any)
	if len(repos) != 1 || repos[0]["name"] != "stylette" {
		t.Fatalf("expected stylette repo, got %v", repos)
	}
	names, _ := result["allRepoNames"].([]string)
	if len(names) != 20 {
		t.Fatalf("expected 20 sample names, got %d", len(names))
	}
}

func TestSearchListUserReposZeroMatchSuggestion(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/user":
			_, _ = w.Write([]byte(`{"login":"leoakok"}`))
		case "/user/repos":
			_, _ = w.Write([]byte(`[{"name":"alpha","full_name":"leoakok/alpha","fork":false},{"name":"beta","full_name":"leoakok/beta","fork":false}]`))
		case "/users/leoakok/orgs":
			_, _ = w.Write([]byte(`[]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	result, err := client.Search("stylette", true, 10)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if result["matchedCount"] != 0 {
		t.Fatalf("expected matchedCount=0, got %v", result["matchedCount"])
	}
	suggestion, _ := result["suggestion"].(string)
	if !strings.Contains(suggestion, "stylette") || !strings.Contains(suggestion, "alpha") {
		t.Fatalf("expected suggestion with repo names, got %q", suggestion)
	}
}

func TestGithubRepoMatchesQueryFuzzy(t *testing.T) {
	repo := map[string]any{
		"name":        "Styllette",
		"full_name":   "leoakok/Styllette",
		"description": "A styling app",
		"topics":      []any{"css"},
	}
	if !githubRepoMatchesQuery(repo, "stylette") {
		t.Fatal("expected fuzzy match for stylette -> Styllette")
	}
	if !githubRepoMatchesQuery(repo, "sty") {
		t.Fatal("expected substring match for sty")
	}
	if !githubRepoMatchesQuery(repo, "css") {
		t.Fatal("expected topic match")
	}
	if githubRepoMatchesQuery(repo, "xyzmissing") {
		t.Fatal("expected no match for unrelated query")
	}
}

func TestFetchAuthenticatedUserReposEmptyBodyPageStops(t *testing.T) {
	page1 := make([]map[string]any, 0, githubUserReposPageSize)
	for i := 0; i < githubUserReposPageSize; i++ {
		page1 = append(page1, map[string]any{
			"name":      fmt.Sprintf("repo-%03d", i),
			"full_name": fmt.Sprintf("leoakok/repo-%03d", i),
			"fork":      false,
		})
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/user/repos" {
			http.NotFound(w, r)
			return
		}
		page := r.URL.Query().Get("page")
		if page == "" || page == "1" {
			w.Header().Set("Content-Type", "application/json")
			b, _ := json.Marshal(page1)
			_, _ = w.Write(b)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	repos, err := client.fetchAllAuthenticatedUserRepos()
	if err != nil {
		t.Fatalf("fetchAllAuthenticatedUserRepos: %v", err)
	}
	if len(repos) != githubUserReposPageSize {
		t.Fatalf("expected %d repos from page 1, got %d", githubUserReposPageSize, len(repos))
	}
}

func TestDoAPIRequestEmptyBodyReturnsEmptyArray(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	repos, err := client.apiGetArray("/user/repos?page=2")
	if err != nil {
		t.Fatalf("apiGetArray empty body: %v", err)
	}
	if len(repos) != 0 {
		t.Fatalf("expected empty array, got %d repos", len(repos))
	}
}

func TestDoAPIRequestParseErrorIncludesStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"broken"`))
	}))
	defer srv.Close()

	orig := githubAPIBaseURL
	githubAPIBaseURL = srv.URL
	defer func() { githubAPIBaseURL = orig }()

	client := NewGitHubClientWithToken("token")
	_, err := client.apiGetArray("/user/repos")
	if err == nil {
		t.Fatal("expected parse error")
	}
	if !strings.Contains(err.Error(), "HTTP 200") {
		t.Fatalf("expected status in error, got %q", err.Error())
	}
}
