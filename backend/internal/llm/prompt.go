package llm

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

func buildAgentSystemPrompt(assistantContext model.AssistantContextInput, twinContext string, githubConnected bool, githubLogin string) string {
	var b strings.Builder
	b.WriteString(systemPrompt)
	b.WriteString("\n\n")
	b.WriteString(mcp.ToolCatalog())
	if githubConnected {
		loginHint := ""
		if githubLogin != "" {
			loginHint = fmt.Sprintf(" Connected as @%s.", githubLogin)
		}
		b.WriteString(fmt.Sprintf(
			"\n## GitHub status\nUser has connected GitHub.%s When the user asks for their projects/repos, call search_github with listUserRepos true. Omit query to list repos, or pass a project name (e.g. \"stylette\") to filter across ALL their repos, the tool paginates /user/repos and matches name, description, and topics. Check totalRepos, matchedCount, and suggestion in results. ONLY import repos returned for authenticatedAs / importRepositories, NEVER import from web_search hits on other GitHub profiles or unrelated explore_website URLs. When importing projects, batch create_twin_entry from those results only.\n",
			loginHint,
		))
	} else {
		b.WriteString("\n## GitHub status\nGitHub is not connected, use explore_website and web_search for public GitHub pages. Do not ask the user to connect.\n")
	}
	b.WriteString("\n## Current UI context\n")
	ctxJSON, _ := json.Marshal(assistantContext)
	b.WriteString(string(ctxJSON))
	b.WriteString("\n")
	switch assistantContext.View {
	case model.AssistantViewPortfolioDetail:
		if assistantContext.PortfolioID != nil && *assistantContext.PortfolioID != "" {
			b.WriteString(fmt.Sprintf(
				"Open in editor: portfolio %q (UI context). Use this id only when they mean this/current portfolio without naming another. If they name a site or person → list_portfolios and match by title first. Hero/contact → update_portfolio_contact_profile; tagline/about → update_portfolio; projects → add_portfolio_project / update_portfolio_project; skills → add_portfolio_skill.\n",
				*assistantContext.PortfolioID,
			))
		} else {
			b.WriteString("On a portfolio page without portfolioId, call list_portfolios if unclear which site.\n")
		}
	case model.AssistantViewPortfolios:
		b.WriteString("On Portfolios list. Build showcase sites with create_portfolio, add_portfolio_project (3–5 case studies with PAR), add_portfolio_skill, update_portfolio for tagline/about. Never output a markdown portfolio draft in chat.\n")
	case model.AssistantViewResumeDetail:
		if assistantContext.ResumeID != nil && *assistantContext.ResumeID != "" {
			b.WriteString(fmt.Sprintf(
				"Open in editor: resume %q (UI context). Use this id only when they mean this/current resume without naming another. If they name a CV or person → list_resumes and match by title first. Profile header → update_contact_profile; sections below → section tools.\n",
				*assistantContext.ResumeID,
			))
		} else {
			b.WriteString("On a resume page without resumeId, call list_resumes if unclear which CV.\n")
		}
	case model.AssistantViewDigitalTwin:
		b.WriteString("On Digital Twin. STAR/PAR depth is non-negotiable, maintain entries via twin tools; do not tell them to add entries manually. Surface the thinnest STAR/PAR gaps and ask one natural deepening question. Every experience entry should eventually reach full STAR. Exception: GitHub/website import, batch-create PROJECT entries for every importRepos/importItems entry without per-repo STAR questions. Resume tools only when they ask to update a CV.\n")
	case model.AssistantViewJobTracker:
		if assistantContext.JobID != nil && *assistantContext.JobID != "" {
			b.WriteString(fmt.Sprintf(
				"On Job Tracker with tracked job %q. Workflow: (1) fetch_url + web_search if blocked to extract requirements, (2) list_twin_entries + get_resume_content and compare skills, if the posting requires something not in Twin/CV, ask ONE short question before adding it, (3) duplicate/create and tailor with confirmed facts only, (4) cover letter, (5) update_tracked_job with resumeId and coverLetter. If waiting on a skill-gap answer, reply with the question only. Otherwise finish update_tracked_job before confirming.\n",
				*assistantContext.JobID,
			))
		} else {
			b.WriteString("On Job Tracker. Compare job requirements to Twin + CV; ask about missing skills before inventing them. Save via update_tracked_job.\n")
		}
	case model.AssistantViewResumes:
		b.WriteString("On Resumes list. Role-target requests (e.g. \"CV for forward deployed engineer\"): Role-targeted CV workflow, list_twin_entries and list_resumes before create/duplicate, web_search the role, assess fit honestly, add_section_item with tailored SUMMARY and new role-specific experience/project items (not visibility toggles alone), get_resume_content to verify visible content before confirming.\n")
	case model.AssistantViewSections, model.AssistantViewItems:
		b.WriteString("Browsing section library. Use list_sections / list_resumes to target a CV.\n")
	default:
		b.WriteString("When create/build intent is clear → tools this turn. Role-target create (\"CV for [role]\") → Role-targeted CV workflow: know user (Twin + resumes), research role, assess fit, create with tailored new items, verify content. If the message is short or unclear, ask one clarifying question first, never a chat-only CV draft.\n")
	}
	if twinContext != "" {
		b.WriteString("\n")
		b.WriteString(twinContext)
		b.WriteString("\n\nTailor from Twin when relevant, do not copy everything onto every CV. Entries marked missing need STAR/PAR follow-up questions over time; thin Twin = weaker CV bullets.\n")
	} else {
		b.WriteString("\nNo Twin entries yet, learn through conversation: always think STAR/PAR when they mention experience or projects. create_twin_entry with structured fields before CV work; ask one natural question for the weakest missing piece.\n")
	}
	return b.String()
}
