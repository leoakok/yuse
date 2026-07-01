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
			return fmt.Sprintf("Let me search for %q…", truncateLabel(q, 48))
		}
		return "Let me search for that…"
	case "fetch_url":
		return "Let me read that page…"
	case "explore_website":
		return "Let me explore that site…"
	case "crawl_site":
		return "Let me explore that site…"
	case "crawl_github_profile":
		return "Let me check your GitHub profile…"
	case "search_github":
		if listRepos, ok := optionalBool(args, "listUserRepos"); ok && listRepos {
			if q, ok := optionalString(args, "query"); ok && strings.TrimSpace(q) != "" {
				return fmt.Sprintf("Let me search your GitHub for %q…", truncateLabel(q, 48))
			}
			return "Let me look through your GitHub repos…"
		}
		if q, ok := optionalString(args, "query"); ok && q != "" {
			return fmt.Sprintf("Let me search GitHub for %q…", truncateLabel(q, 48))
		}
		return "Let me search GitHub…"
	case "fetch_linkedin_profile":
		return "Let me check your LinkedIn profile…"
	case "get_resume_content":
		return "Let me read your CV…"
	case "get_resume":
		return "Let me pull up that CV…"
	case "list_resumes":
		return "Let me see what CVs you have…"
	case "list_sections":
		return "Let me check your CV sections…"
	case "list_twin_entries":
		return "Let me look at your Digital Twin…"
	case "get_twin_entry":
		return "Let me pull up that twin entry…"
	case "list_cv_themes":
		return "Let me load CV themes…"
	case "create_resume":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("I'll create a CV called %q…", truncateLabel(title, 40))
		}
		return "I'll create a new CV for you…"
	case "duplicate_resume":
		return "Let me duplicate that CV…"
	case "delete_resume":
		return "Let me delete that CV…"
	case "update_resume":
		return "Let me update the CV title…"
	case "add_section_item":
		if headline, ok := optionalString(args, "headline"); ok && headline != "" {
			return fmt.Sprintf("Let me add %s to your CV…", truncateLabel(headline, 40))
		}
		return "Let me add something to your CV…"
	case "update_section_item":
		return "Let me update that CV entry…"
	case "set_item_visibility":
		return "Let me update what's visible…"
	case "reorder_resume_sections":
		return "Let me reorder your CV sections…"
	case "set_section_visibility":
		return "Let me update section visibility…"
	case "update_section_display_title":
		return "Let me rename that section…"
	case "delete_section_item":
		return "Let me remove that entry…"
	case "update_contact_profile":
		return "Let me update your contact details…"
	case "update_resume_settings":
		return "Let me tweak the CV design…"
	case "list_portfolios":
		return "Let me see what portfolios you have…"
	case "get_portfolio_content":
		return "Let me read your portfolio…"
	case "get_portfolio":
		return "Let me pull up that portfolio…"
	case "create_portfolio":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("I'll create a portfolio called %q…", truncateLabel(title, 40))
		}
		return "I'll create a new portfolio for you…"
	case "duplicate_portfolio":
		return "Let me duplicate that portfolio…"
	case "delete_portfolio":
		return "Let me delete that portfolio…"
	case "update_portfolio":
		return "Let me update your portfolio…"
	case "add_portfolio_project":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("Let me add the project %q…", truncateLabel(title, 40))
		}
		return "Let me add a project…"
	case "update_portfolio_project":
		return "Let me update that project…"
	case "delete_portfolio_project":
		return "Let me remove that project…"
	case "add_portfolio_skill":
		if name, ok := optionalString(args, "name"); ok && name != "" {
			return fmt.Sprintf("Let me add %s as a skill…", truncateLabel(name, 40))
		}
		return "Let me add a skill…"
	case "update_portfolio_skill":
		return "Let me update that skill…"
	case "delete_portfolio_skill":
		return "Let me remove that skill…"
	case "add_portfolio_testimonial":
		return "Let me add a testimonial…"
	case "update_portfolio_testimonial":
		return "Let me update that testimonial…"
	case "delete_portfolio_testimonial":
		return "Let me remove that testimonial…"
	case "update_portfolio_contact_profile":
		return "Let me update your profile…"
	case "update_portfolio_settings":
		return "Let me tweak the portfolio design…"
	case "create_twin_entry":
		if title, ok := optionalString(args, "title"); ok && title != "" {
			return fmt.Sprintf("Let me save %q to your Digital Twin…", truncateLabel(title, 40))
		}
		return "Let me save that to your Digital Twin…"
	case "update_twin_entry":
		return "Let me update your Digital Twin…"
	case "list_tracked_jobs":
		return "Let me check your tracked jobs…"
	case "get_tracked_job":
		return "Let me pull up that job application…"
	case "create_tracked_job":
		return "Let me add that job to your tracker…"
	case "update_tracked_job":
		return "Let me save that job application…"
	case "delete_tracked_job":
		return "Let me remove that tracked job…"
	case "delete_twin_entry":
		return "Let me remove that twin entry…"
	default:
		return "Let me " + humanizeToolName(toolName) + "…"
	}
}

// ToolActivityEndLabel returns a user-facing label after a tool finishes.
func ToolActivityEndLabel(exec Execution) string {
	if exec.Error != "" {
		return ToolActivityStartLabel(exec.Tool, exec.Arguments)
	}
	switch exec.Tool {
	case "web_search":
		return "Found some useful links"
	case "fetch_url":
		return "Read that page"
	case "explore_website", "crawl_site":
		return "Finished exploring the site"
	case "crawl_github_profile":
		return "Got your GitHub profile"
	case "search_github":
		if m, ok := exec.Result.(map[string]any); ok {
			if auth := AuthenticatedAsFromResult(m); auth != "" {
				count := repoCountFromResult(m, "repositories", "importRepositories")
				query, _ := m["query"].(string)
				query = strings.TrimSpace(query)
				if query == "" {
					if count > 0 {
						return githubReposFoundLabel(count)
					}
					return "Got your GitHub repos"
				}
				matched := intFromAny(m["matchedCount"])
				if matched == 0 {
					matched = count
				}
				return fmt.Sprintf("Found %d matching repos on your GitHub", matched)
			}
		}
		return "Finished searching GitHub"
	case "fetch_linkedin_profile":
		return "Got your LinkedIn profile"
	case "get_resume_content":
		return "Read your CV"
	case "get_resume":
		return "Pulled up that CV"
	case "list_resumes":
		return "Checked your CVs"
	case "list_sections":
		return "Checked your CV sections"
	case "list_twin_entries":
		return "Looked at your Digital Twin"
	case "get_twin_entry":
		return "Pulled up that twin entry"
	case "list_cv_themes":
		return "Loaded CV themes"
	case "create_resume":
		return "Created your new CV"
	case "duplicate_resume":
		return "Duplicated that CV"
	case "delete_resume":
		return "Deleted that CV"
	case "update_resume":
		return "Updated the CV title"
	case "add_section_item":
		return "Added something to your CV"
	case "update_section_item":
		return "Updated that CV entry"
	case "set_item_visibility":
		return "Updated what's visible"
	case "reorder_resume_sections":
		return "Reordered your CV sections"
	case "set_section_visibility":
		return "Updated section visibility"
	case "update_section_display_title":
		return "Updated the section heading"
	case "delete_section_item":
		return "Removed that entry"
	case "update_contact_profile":
		return "Updated your contact details"
	case "update_resume_settings":
		return "Updated the CV design"
	case "list_portfolios":
		return "Checked your portfolios"
	case "get_portfolio_content":
		return "Read your portfolio"
	case "get_portfolio":
		return "Pulled up that portfolio"
	case "create_portfolio":
		return "Created your new portfolio"
	case "duplicate_portfolio":
		return "Duplicated that portfolio"
	case "delete_portfolio":
		return "Deleted that portfolio"
	case "update_portfolio":
		return "Updated your portfolio"
	case "add_portfolio_project":
		return "Added a project"
	case "update_portfolio_project":
		return "Updated that project"
	case "delete_portfolio_project":
		return "Removed that project"
	case "add_portfolio_skill":
		return "Added a skill"
	case "update_portfolio_skill":
		return "Updated that skill"
	case "delete_portfolio_skill":
		return "Removed that skill"
	case "add_portfolio_testimonial":
		return "Added a testimonial"
	case "update_portfolio_testimonial":
		return "Updated that testimonial"
	case "delete_portfolio_testimonial":
		return "Removed that testimonial"
	case "update_portfolio_contact_profile":
		return "Updated your profile"
	case "update_portfolio_settings":
		return "Updated the portfolio design"
	case "create_twin_entry":
		return "Saved to your Digital Twin"
	case "update_twin_entry":
		return "Updated your Digital Twin"
	case "delete_twin_entry":
		return "Removed that twin entry"
	case "list_tracked_jobs":
		return "Checked your tracked jobs"
	case "get_tracked_job":
		return "Pulled up that job application"
	case "create_tracked_job":
		return "Added the job to your tracker"
	case "update_tracked_job":
		return "Saved that job application"
	case "delete_tracked_job":
		return "Removed that tracked job"
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
