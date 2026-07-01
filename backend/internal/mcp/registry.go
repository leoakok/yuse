package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/leo/ai-weekend/backend/graph/model"
	openai "github.com/sashabaranov/go-openai"
)

// Execution records a single tool invocation from the agent loop.
type Execution struct {
	Tool              string
	Arguments         map[string]any
	Result            any
	Error             string
	AffectedResumeIDs   []string
	AffectedPortfolioIDs []string
	DurationMs          int64
}

// Registry holds MCP/OpenAI tool definitions and dispatches execution to the platform.
type Registry struct {
	exec     Executor
	web      *WebClient
	github   *GitHubClient
	linkedin *LinkedInProfileClient
}

func NewRegistry(exec Executor) *Registry {
	token := strings.TrimSpace(exec.GitHubAccessToken())
	var gh *GitHubClient
	if token != "" {
		gh = NewGitHubClientWithToken(token)
	} else {
		gh = NewGitHubClientFromEnv()
	}
	return &Registry{
		exec:     exec,
		web:      NewWebClientFromEnv(),
		github:   gh,
		linkedin: NewLinkedInProfileClientFromEnv(),
	}
}

func (r *Registry) OpenAITools() []openai.Tool {
	defs := toolDefinitions()
	out := make([]openai.Tool, 0, len(defs))
	for _, def := range defs {
		out = append(out, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        def.Name,
				Description: def.Description,
				Parameters:  def.Parameters,
			},
		})
	}
	return out
}

func (r *Registry) Execute(toolName string, argsJSON []byte) Execution {
	return r.ExecuteWithProgress(toolName, argsJSON, nil)
}

func (r *Registry) ExecuteWithProgress(toolName string, argsJSON []byte, progress ToolProgress) (exec Execution) {
	start := time.Now()
	defer func() {
		exec.DurationMs = time.Since(start).Milliseconds()
	}()

	var args map[string]any
	if len(argsJSON) > 0 {
		_ = json.Unmarshal(argsJSON, &args)
	}
	if args == nil {
		args = map[string]any{}
	}

	exec = Execution{Tool: toolName, Arguments: args}

	switch toolName {
	case "list_resumes":
		exec.Result = r.exec.ListResumes()

	case "get_resume":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		resume, err := r.exec.GetResume(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resume

	case "create_resume":
		title, _ := optionalString(args, "title")
		resume := r.exec.CreateResume(title)
		exec.Result = resume
		exec.AffectedResumeIDs = []string{resume.ID}

	case "duplicate_resume":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		resume, err := r.exec.DuplicateResume(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resume
		exec.AffectedResumeIDs = []string{resume.ID}

	case "delete_resume":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		ok, err := r.exec.DeleteResume(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = map[string]any{"deleted": ok, "id": id}

	case "update_resume":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		title, _ := optionalString(args, "title")
		var titlePtr *string
		if title != "" {
			titlePtr = &title
		}
		resume, err := r.exec.UpdateResume(id, titlePtr, nil)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resume
		exec.AffectedResumeIDs = []string{resume.ID}

	case "get_resume_content":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		content, err := r.exec.GetResumeWithContent(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resumeContentSummary(content)

	case "update_contact_profile":
		applyArgAlias(args, "resumeId", "resume_id")
		applyArgAlias(args, "fullName", "name")
		applyArgAlias(args, "headline", "title", "professionalTitle")
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.UpdateContactProfileInput{ResumeID: resumeID}
		input.FullName = optionalStringPtr(args, "fullName")
		input.Headline = optionalStringPtr(args, "headline")
		input.Email = optionalStringPtr(args, "email")
		input.Phone = optionalStringPtr(args, "phone")
		input.Location = optionalStringPtr(args, "location")
		input.Website = optionalStringPtr(args, "website")
		input.LinkedIn = optionalStringPtr(args, "linkedIn")
		input.Github = optionalStringPtr(args, "github")
		input.PhotoURL = optionalStringPtr(args, "photoUrl")
		input.LinkedinPhotoURL = optionalStringPtr(args, "linkedinPhotoUrl")
		input.GithubPhotoURL = optionalStringPtr(args, "githubPhotoUrl")
		content, err := r.exec.UpdateContactProfile(context.Background(), input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = map[string]any{
			"resumeId":       resumeID,
			"contactProfile": contactProfileFromContent(content),
			"fieldHints":     contactProfileFieldHints(args),
		}
		exec.AffectedResumeIDs = []string{resumeID}

	case "add_section_item":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		section := findSection(r.exec, sectionID)
		mergeFlatFieldsIntoMetadata(args)
		if section != nil {
			normalizeSectionItemArgs(section.Type, args)
		}
		headline, _ := optionalString(args, "headline")
		body, _ := optionalString(args, "body")
		metadata := optionalMetadata(args, "metadata")
		if err := validateSectionItemInput(section, headline, body, metadata); err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.AddResumeSectionItemInput{
			ResumeID:  resumeID,
			SectionID: sectionID,
			Headline:  optionalStringPtr(args, "headline"),
			Body:      optionalStringPtr(args, "body"),
			Metadata:  optionalMetadata(args, "metadata"),
		}
		content, err := r.exec.AddResumeSectionItem(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = wrapSectionItemWriteResult(content, section, headline, body, metadata)
		exec.AffectedResumeIDs = []string{resumeID}

	case "update_section_item":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionItemID, err := requireString(args, "sectionItemId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		section := findSection(r.exec, sectionID)
		mergeFlatFieldsIntoMetadata(args)
		if section != nil {
			normalizeSectionItemArgs(section.Type, args)
		}
		headline, _ := optionalString(args, "headline")
		body, _ := optionalString(args, "body")
		metadata := optionalMetadata(args, "metadata")
		if err := validateSectionItemInput(section, headline, body, metadata); err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.UpdateResumeSectionItemInput{
			ResumeID:      resumeID,
			SectionID:     sectionID,
			SectionItemID: sectionItemID,
			Headline:      optionalStringPtr(args, "headline"),
			Body:          optionalStringPtr(args, "body"),
			Metadata:      optionalMetadata(args, "metadata"),
		}
		content, err := r.exec.UpdateResumeSectionItem(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = wrapSectionItemWriteResult(content, section, headline, body, metadata)
		exec.AffectedResumeIDs = []string{resumeID}

	case "reorder_resume_sections":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionIDs, err := optionalStringSliceRequired(args, "sectionIds")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		content, err := r.exec.ReorderResumeSections(model.ReorderResumeSectionsInput{
			ResumeID:   resumeID,
			SectionIds: sectionIDs,
		})
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resumeContentSummary(content)
		exec.AffectedResumeIDs = []string{resumeID}

	case "set_section_visibility":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		show, err := requireBool(args, "showInPreview")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		content, err := r.exec.UpdateResumeSectionVisibility(model.UpdateResumeSectionVisibilityInput{
			ResumeID:      resumeID,
			SectionID:     sectionID,
			ShowInPreview: show,
		})
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resumeContentSummary(content)
		exec.AffectedResumeIDs = []string{resumeID}

	case "update_section_display_title":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		var displayTitle *string
		if v, ok := optionalString(args, "displayTitle"); ok {
			displayTitle = &v
		}
		content, err := r.exec.UpdateResumeSectionDisplayTitle(model.UpdateResumeSectionDisplayTitleInput{
			ResumeID:     resumeID,
			SectionID:    sectionID,
			DisplayTitle: displayTitle,
		})
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resumeContentSummary(content)
		exec.AffectedResumeIDs = []string{resumeID}

	case "delete_section_item":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionItemID, err := requireString(args, "sectionItemId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		content, err := r.exec.DeleteSectionItem(resumeID, sectionItemID)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = resumeContentSummary(content)
		exec.AffectedResumeIDs = []string{resumeID}

	case "set_item_visibility":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		sectionItemID, err := requireString(args, "sectionItemId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		show, err := requireBool(args, "showInPreview")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.UpdateResumeSectionItemVisibilityInput{
			ResumeID:      resumeID,
			SectionID:     sectionID,
			SectionItemID: sectionItemID,
			ShowInPreview: show,
		}
		content, err := r.exec.UpdateResumeSectionItemVisibility(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = content
		exec.AffectedResumeIDs = []string{resumeID}

	case "update_resume_settings":
		resumeID, err := requireString(args, "resumeId")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := buildUpdateResumeSettingsInput(resumeID, args)
		settings, err := r.exec.UpdateResumeSettings(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = settings
		exec.AffectedResumeIDs = []string{resumeID}

	case "list_sections":
		var sectionType *model.SectionType
		if v, ok := optionalEnum(args, "type"); ok && v != "" {
			st := model.SectionType(v)
			if st.IsValid() {
				sectionType = &st
			}
		}
		exec.Result = r.exec.ListSections(sectionType)

	case "list_cv_themes":
		exec.Result = r.exec.ListCvThemes()

	case "list_twin_entries":
		exec.Result = r.exec.ListTwinEntries()

	case "get_twin_entry":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		entry, err := r.exec.GetTwinEntry(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = entry

	case "create_twin_entry":
		title, err := requireString(args, "title")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		entryType := model.TwinEntryTypeExperience
		if v, ok := optionalEnum(args, "type"); ok && v != "" {
			entryType = model.TwinEntryType(v)
		}
		body, _ := optionalString(args, "body")
		mergeTwinFieldsIntoMetadata(args)
		if err := validateTwinEntryInput(entryType, args); err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.CreateTwinEntryInput{
			Type:     entryType,
			Title:    title,
			Body:     body,
			Metadata: optionalMetadata(args, "metadata"),
		}
		entry, err := r.exec.CreateTwinEntry(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = wrapTwinEntryResult(entry, args)

	case "update_twin_entry":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.UpdateTwinEntryInput{ID: id}
		if v, ok := optionalEnum(args, "type"); ok && v != "" {
			t := model.TwinEntryType(v)
			input.Type = &t
		}
		mergeTwinFieldsIntoMetadata(args)
		input.Title = optionalStringPtr(args, "title")
		input.Body = optionalStringPtr(args, "body")
		input.Metadata = optionalMetadata(args, "metadata")
		if v, ok := optionalInt(args, "sortOrder"); ok {
			input.SortOrder = &v
		}
		entry, err := r.exec.UpdateTwinEntry(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = wrapTwinEntryResult(entry, args)

	case "delete_twin_entry":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		ok, err := r.exec.DeleteTwinEntry(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = map[string]any{"deleted": ok, "id": id}

	case "list_tracked_jobs":
		exec.Result = r.exec.ListTrackedJobs()

	case "get_tracked_job":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		job, err := r.exec.GetTrackedJob(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = job

	case "create_tracked_job":
		url, err := requireString(args, "url")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		job, err := r.exec.CreateTrackedJob(url)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = job

	case "delete_tracked_job":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		ok, err := r.exec.DeleteTrackedJob(id)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = map[string]any{"deleted": ok, "id": id}

	case "update_tracked_job":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		input := model.UpdateTrackedJobInput{ID: id}
		if title, ok := optionalString(args, "title"); ok {
			input.Title = &title
		}
		if company, ok := optionalString(args, "company"); ok {
			input.Company = &company
		}
		if status, ok := optionalEnum(args, "status"); ok {
			s := model.JobStatus(strings.ToUpper(status))
			input.Status = &s
		}
		if notes, ok := optionalString(args, "notes"); ok {
			input.Notes = &notes
		}
		if resumeID, ok := optionalString(args, "resumeId"); ok {
			input.ResumeID = &resumeID
		}
		if coverLetter, ok := optionalString(args, "coverLetter"); ok {
			input.CoverLetter = &coverLetter
		}
		mergeTrackedJobMetadata(args)
		if metadata := optionalMetadata(args, "metadata"); metadata != nil {
			input.Metadata = metadata
		}
		job, err := r.exec.UpdateTrackedJob(input)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = wrapTrackedJobResult(job)
		if job.ResumeID != nil && *job.ResumeID != "" {
			exec.AffectedResumeIDs = []string{*job.ResumeID}
		}

	case "web_search":
		query, err := requireString(args, "query")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		result, err := r.web.Search(query)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = result

	case "fetch_url":
		rawURL, err := requireString(args, "url")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		if isLinkedInProfileURL(rawURL) {
			email := strings.TrimSpace(r.exec.UserEmail())
			if email == "" {
				exec.Error = "email is required to fetch a LinkedIn profile"
				return exec
			}
			result, liErr := r.linkedin.FetchProfile(rawURL, email)
			if liErr != nil {
				exec.Error = liErr.Error()
				return exec
			}
			exec.Result = result
			return exec
		}
		if isGitHubProfileURL(rawURL) || isGitHubRepoURL(rawURL) {
			result, ghErr := r.github.FetchURL(rawURL)
			if ghErr != nil {
				exec.Error = ghErr.Error()
				return exec
			}
			exec.Result = result
			return exec
		}
		result, err := r.web.Fetch(rawURL)
		if err != nil {
			if isLinkedInJobURL(rawURL) {
				query := linkedInJobSearchQuery(rawURL, map[string]any{})
				if search, searchErr := r.web.Search(query); searchErr == nil {
					exec.Result = map[string]any{
						"url":              rawURL,
						"fetchError":       err.Error(),
						"webSearchFallback": search,
						"note":             "LinkedIn direct fetch failed; used web_search fallback.",
					}
					return exec
				}
			}
			if isGitHubHostURL(rawURL) {
				if ghResult, ghErr := r.github.FetchURL(rawURL); ghErr == nil {
					exec.Result = ghResult
					return exec
				}
			}
			exec.Error = err.Error()
			return exec
		}
		if needsLinkedInJobFallback(rawURL, result) {
			query := linkedInJobSearchQuery(rawURL, result)
			if search, searchErr := r.web.Search(query); searchErr == nil {
				result["webSearchFallback"] = search
				result["note"] = "LinkedIn page had limited text; included web_search fallback."
			}
		}
		if needsGitHubAPIFallback(rawURL, result) {
			if ghResult, ghErr := r.github.FetchURL(rawURL); ghErr == nil {
				result["githubApiFallback"] = ghResult
				result["note"] = "GitHub HTML had limited text; included GitHub API data."
			}
		}
		exec.Result = result

	case "crawl_site":
		rawURL, err := requireString(args, "url")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		if isGitHubProfileURL(rawURL) {
			exec.Error = "use explore_website for GitHub profiles, it uses the GitHub API and returns importItems"
			return exec
		}
		maxPages := 0
		if v, ok := args["maxPages"]; ok {
			switch n := v.(type) {
			case float64:
				maxPages = int(n)
			case int:
				maxPages = n
			}
		}
		result, err := r.web.CrawlSite(rawURL, maxPages)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = result

	case "crawl_github_profile":
		rawURL, err := requireString(args, "url")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		maxRepos := 0
		if v, ok := args["maxRepos"]; ok {
			switch n := v.(type) {
			case float64:
				maxRepos = int(n)
			case int:
				maxRepos = n
			}
		}
		result, err := r.github.CrawlProfile(rawURL, maxRepos, progress, r.web)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		enrichGitHubProfileResult(result)
		exec.Result = result

	case "explore_website":
		rawURL, err := requireString(args, "url")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		if isLinkedInProfileURL(rawURL) {
			email := strings.TrimSpace(r.exec.UserEmail())
			if email == "" {
				exec.Error = "email is required to fetch a LinkedIn profile"
				return exec
			}
			result, liErr := r.linkedin.FetchProfile(rawURL, email)
			if liErr != nil {
				exec.Error = liErr.Error()
				return exec
			}
			enrichLinkedInProfileResult(result)
			result["siteKind"] = "linkedin_profile"
			result["strategy"] = "linkedin_profile"
			exec.Result = result
			return exec
		}
		maxPages := 0
		if v, ok := args["maxPages"]; ok {
			switch n := v.(type) {
			case float64:
				maxPages = int(n)
			case int:
				maxPages = n
			}
		}
		maxItems := 0
		if v, ok := args["maxItems"]; ok {
			switch n := v.(type) {
			case float64:
				maxItems = int(n)
			case int:
				maxItems = n
			}
		}
		explorer := &WebsiteExplorer{Web: r.web, GitHub: r.github}
		result, err := explorer.Explore(rawURL, maxPages, maxItems, progress)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = result

	case "search_github":
		listUserRepos := false
		if v, ok := optionalBool(args, "listUserRepos"); ok {
			listUserRepos = v
		} else if strings.TrimSpace(r.exec.GitHubAccessToken()) != "" {
			listUserRepos = true
		}
		query := ""
		if q, ok := optionalString(args, "query"); ok {
			query = strings.TrimSpace(q)
		}
		if query == "" && !(listUserRepos && r.github.HasToken()) {
			exec.Error = "query is required unless listUserRepos is true with a connected GitHub account"
			return exec
		}
		maxResults := 0
		if v, ok := optionalInt(args, "maxResults"); ok {
			maxResults = v
		}
		result, err := r.github.Search(query, listUserRepos, maxResults)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		exec.Result = result

	case "fetch_linkedin_profile":
		applyArgAlias(args, "profileUrl", "profile_url", "url")
		profileURL, err := requireString(args, "profileUrl")
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		email, _ := optionalString(args, "email")
		if strings.TrimSpace(email) == "" {
			email = strings.TrimSpace(r.exec.UserEmail())
		}
		if email == "" {
			exec.Error = "email is required to fetch a LinkedIn profile"
			return exec
		}
		result, err := r.linkedin.FetchProfile(profileURL, email)
		if err != nil {
			exec.Error = err.Error()
			return exec
		}
		enrichLinkedInProfileResult(result)
		exec.Result = result

	default:
		if r.executePortfolioTool(toolName, args, &exec) {
			return exec
		}
		exec.Error = fmt.Sprintf("unknown tool: %s", toolName)
	}

	return exec
}

func (e Execution) ResultJSON() string {
	if e.Error != "" {
		payload, _ := json.Marshal(map[string]string{"error": e.Error})
		return string(payload)
	}
	raw, err := json.Marshal(e.Result)
	if err != nil {
		payload, _ := json.Marshal(map[string]string{"error": err.Error()})
		return string(payload)
	}
	return string(raw)
}

func requireString(args map[string]any, key string) (string, error) {
	v, ok := args[key]
	if !ok {
		return "", fmt.Errorf("%s is required", key)
	}
	s, ok := v.(string)
	if !ok || strings.TrimSpace(s) == "" {
		return "", fmt.Errorf("%s must be a non-empty string", key)
	}
	return strings.TrimSpace(s), nil
}

func optionalString(args map[string]any, key string) (string, bool) {
	v, ok := args[key]
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

func optionalStringPtr(args map[string]any, key string) *string {
	if s, ok := optionalString(args, key); ok {
		return &s
	}
	return nil
}

func requireBool(args map[string]any, key string) (bool, error) {
	v, ok := args[key]
	if !ok {
		return false, fmt.Errorf("%s is required", key)
	}
	switch b := v.(type) {
	case bool:
		return b, nil
	default:
		return false, fmt.Errorf("%s must be a boolean", key)
	}
}

func optionalBool(args map[string]any, key string) (bool, bool) {
	v, ok := args[key]
	if !ok {
		return false, false
	}
	b, ok := v.(bool)
	return b, ok
}

func optionalEnum(args map[string]any, key string) (string, bool) {
	return optionalString(args, key)
}

func optionalInt(args map[string]any, key string) (int, bool) {
	v, ok := args[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	default:
		return 0, false
	}
}

func optionalFloat(args map[string]any, key string) (float64, bool) {
	v, ok := args[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}

func optionalMetadata(args map[string]any, key string) map[string]any {
	v, ok := args[key]
	if !ok {
		return nil
	}
	m, ok := v.(map[string]any)
	if !ok {
		return nil
	}
	return m
}

func applyArgAlias(args map[string]any, target string, aliases ...string) {
	if _, ok := args[target]; ok {
		return
	}
	for _, alias := range aliases {
		if v, ok := args[alias]; ok {
			args[target] = v
			return
		}
	}
}

func resumeContentSummary(content *model.ResumeWithContent) map[string]any {
	out := map[string]any{
		"resumeId":    content.Resume.ID,
		"resumeTitle": content.Resume.Title,
	}
	if content.ContactProfile != nil {
		cp := content.ContactProfile
		out["contactProfile"] = map[string]any{
			"fullName":         cp.FullName,
			"headline":         cp.Headline,
			"email":            cp.Email,
			"phone":            cp.Phone,
			"location":         cp.Location,
			"website":          cp.Website,
			"linkedIn":         cp.LinkedIn,
			"github":           cp.Github,
			"photoUrl":         cp.PhotoURL,
			"linkedinPhotoUrl": cp.LinkedinPhotoURL,
			"githubPhotoUrl":   cp.GithubPhotoURL,
		}
	} else {
		out["contactProfile"] = nil
		out["contactProfileNote"] = "Profile header not set yet, use update_contact_profile to create it."
	}
	sections := make([]map[string]any, 0, len(content.Sections))
	for _, swi := range content.Sections {
		items := make([]map[string]any, 0, len(swi.Items))
		for _, item := range swi.Items {
			entry := map[string]any{
				"id":            item.ID,
				"headline":      item.Headline,
				"body":          item.Body,
				"showInPreview": item.ShowInPreview,
			}
			if len(item.Metadata) > 0 {
				entry["metadata"] = item.Metadata
				for _, key := range flatMetadataKeys {
					if v, ok := item.Metadata[key]; ok && fmt.Sprint(v) != "" {
						entry[key] = v
					}
				}
			}
			items = append(items, flattenItemMetadata(entry))
		}
		entry := map[string]any{
			"sectionId":     swi.Section.ID,
			"type":          swi.Section.Type,
			"title":         swi.Section.Title,
			"showInPreview": swi.ShowInPreview,
			"fieldGuide":    sectionItemFieldGuideObject(swi.Section.Type),
			"items":         items,
		}
		if swi.DisplayTitle != nil && strings.TrimSpace(*swi.DisplayTitle) != "" {
			entry["displayTitle"] = *swi.DisplayTitle
		}
		sections = append(sections, entry)
	}
	out["sections"] = sections
	if content.Settings != nil {
		out["designSettings"] = resumeDesignSettingsSummary(content.Settings)
	}
	return out
}

func resumeDesignSettingsSummary(s *model.ResumeSettings) map[string]any {
	if s == nil {
		return nil
	}
	summary := map[string]any{
		"pageFormat":         s.PageFormat,
		"designPresetId":     s.DesignPresetID,
		"themeId":            s.ThemeID,
		"fontFamily":         s.FontFamily,
		"accentColor":        s.AccentColor,
		"showPhoto":          s.ShowPhoto,
		"photoPosition":      s.PhotoPosition,
		"photoSize":          s.PhotoSize,
		"itemTitleLayout":    s.ItemTitleLayout,
		"itemTitleSeparator": s.ItemTitleSeparator,
		"itemTitleOrder":     s.ItemTitleOrder,
		"dateFormat":         s.DateFormat,
		"datePosition":       s.DatePosition,
		"skillsLayout":       s.SkillsLayout,
		"atsMode":            s.AtsMode,
		"columnLayout":       s.ColumnLayout,
		"contactLayout":      s.ContactLayout,
		"marginHorizontalMm": s.MarginHorizontalMm,
		"marginVerticalMm":   s.MarginVerticalMm,
		"locale":             s.Locale,
	}
	if len(s.ContactFields) > 0 {
		fields := make([]string, 0, len(s.ContactFields))
		for _, f := range s.ContactFields {
			fields = append(fields, string(f))
		}
		summary["contactFields"] = fields
	}
	return summary
}
