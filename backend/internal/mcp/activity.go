package mcp

import (
	"fmt"
	"strings"
)

// ToolActivityStartLabel returns a user-facing label when a tool begins running.
func ToolActivityStartLabel(toolName string, args map[string]any) string {
	switch toolName {
	case "web_search":
		if q, ok := optionalString(args, "query"); ok && q != "" {
			return fmt.Sprintf("Searching the web for %q…", truncateLabel(q, 48))
		}
		return "Searching the web…"
	case "fetch_url":
		if u, ok := optionalString(args, "url"); ok && u != "" {
			return fmt.Sprintf("Reading %s…", truncateLabel(u, 56))
		}
		return "Reading a web page…"
	case "explore_website":
		if u, ok := optionalString(args, "url"); ok && u != "" {
			return fmt.Sprintf("Exploring %s…", truncateLabel(u, 56))
		}
		return "Exploring website…"
	case "crawl_site":
		if u, ok := optionalString(args, "url"); ok && u != "" {
			return fmt.Sprintf("Exploring %s…", truncateLabel(u, 56))
		}
		return "Exploring website…"
	case "crawl_github_profile":
		if u, ok := optionalString(args, "url"); ok && u != "" {
			return fmt.Sprintf("Crawling GitHub profile %s…", truncateLabel(u, 48))
		}
		return "Crawling GitHub profile…"
	case "search_github":
		if listRepos, ok := optionalBool(args, "listUserRepos"); ok && listRepos {
			if q, ok := optionalString(args, "query"); ok && strings.TrimSpace(q) != "" {
				return fmt.Sprintf("Searching your GitHub repos for %q…", truncateLabel(q, 48))
			}
			return "Listing your GitHub repos…"
		}
		if q, ok := optionalString(args, "query"); ok && q != "" {
			return fmt.Sprintf("Searching GitHub for %q…", truncateLabel(q, 48))
		}
		return "Searching GitHub…"
	case "fetch_linkedin_profile":
		if u := linkedInProfileURLFromArgs(args); u != "" {
			return fmt.Sprintf("Reading LinkedIn profile %s…", truncateLabel(u, 56))
		}
		return "Reading LinkedIn profile…"
	case "get_resume_content":
		return "Reading your resume…"
	case "get_resume":
		return "Looking up resume details…"
	case "list_resumes":
		return "Listing your resumes…"
	case "list_sections":
		return "Listing resume sections…"
	case "list_twin_entries":
		return "Reading your Digital Twin…"
	case "get_twin_entry":
		return "Reading a twin entry…"
	case "list_cv_themes":
		return "Loading CV themes…"
	case "create_resume":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("Creating resume %q…", truncateLabel(title, 40))
		}
		return "Creating a new resume…"
	case "duplicate_resume":
		return "Duplicating resume…"
	case "delete_resume":
		return "Deleting resume…"
	case "update_resume":
		return "Updating resume title…"
	case "add_section_item":
		if headline, ok := optionalString(args, "headline"); ok && headline != "" {
			return fmt.Sprintf("Adding %s…", truncateLabel(headline, 40))
		}
		return "Adding a section item…"
	case "update_section_item":
		return "Updating a section item…"
	case "set_item_visibility":
		return "Updating item visibility…"
	case "update_contact_profile":
		return "Updating your profile…"
	case "update_resume_settings":
		return "Updating resume design…"
	case "list_portfolios":
		return "Listing your portfolios…"
	case "get_portfolio_content":
		return "Reading your portfolio…"
	case "get_portfolio":
		return "Looking up portfolio details…"
	case "create_portfolio":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("Creating portfolio %q…", truncateLabel(title, 40))
		}
		return "Creating a new portfolio…"
	case "duplicate_portfolio":
		return "Duplicating portfolio…"
	case "delete_portfolio":
		return "Deleting portfolio…"
	case "update_portfolio":
		return "Updating portfolio title…"
	case "add_portfolio_section_item":
		if headline, ok := optionalString(args, "headline"); ok && headline != "" {
			return fmt.Sprintf("Adding %s…", truncateLabel(headline, 40))
		}
		return "Adding a section item…"
	case "update_portfolio_section_item":
		return "Updating a section item…"
	case "set_portfolio_item_visibility":
		return "Updating item visibility…"
	case "update_portfolio_contact_profile":
		return "Updating your profile…"
	case "update_portfolio_settings":
		return "Updating portfolio design…"
	case "create_twin_entry":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("Saving to Digital Twin: %s…", truncateLabel(title, 40))
		}
		return "Saving to Digital Twin…"
	case "update_twin_entry":
		return "Updating Digital Twin entry…"
	case "list_tracked_jobs":
		return "Listing tracked jobs…"
	case "get_tracked_job":
		return "Reading job application…"
	case "update_tracked_job":
		return "Saving job application…"
	case "delete_twin_entry":
		return "Deleting twin entry…"
	default:
		return humanizeToolName(toolName) + "…"
	}
}

// ToolActivityEndLabel returns a user-facing label after a tool finishes.
func ToolActivityEndLabel(exec Execution) string {
	if exec.Error != "" {
		return ToolActivityStartLabel(exec.Tool, exec.Arguments)
	}
	switch exec.Tool {
	case "web_search":
		return "Finished web search"
	case "fetch_url":
		return "Finished reading page"
	case "explore_website":
		return "Finished exploring website"
	case "crawl_site":
		return "Finished exploring site"
	case "crawl_github_profile":
		return "Finished GitHub profile crawl"
	case "search_github":
		if exec.Error != "" {
			return "GitHub repo search failed"
		}
		if m, ok := exec.Result.(map[string]any); ok {
			if auth := AuthenticatedAsFromResult(m); auth != "" {
				count := repoCountFromResult(m, "repositories", "importRepositories")
				return fmt.Sprintf("Listed %d repos for %s", count, auth)
			}
		}
		return "Finished GitHub search"
	case "fetch_linkedin_profile":
		return "Finished reading LinkedIn profile"
	case "get_resume_content":
		return "Read resume content"
	case "create_resume":
		return "Created resume"
	case "add_section_item":
		return "Added section item"
	case "update_section_item":
		return "Updated section item"
	case "update_contact_profile":
		return "Updated profile"
	case "create_twin_entry":
		return "Saved to Digital Twin"
	case "update_tracked_job":
		return "Saved job application"
	default:
		label := strings.TrimSuffix(ToolActivityStartLabel(exec.Tool, exec.Arguments), "…")
		return label
	}
}

func humanizeToolName(name string) string {
	return strings.ReplaceAll(name, "_", " ")
}

func truncateLabel(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	return value[:max-1] + "…"
}
