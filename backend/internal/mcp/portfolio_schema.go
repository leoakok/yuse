package mcp

import "github.com/leo/ai-weekend/backend/graph/model"

func portfolioProjectFieldGuide() map[string]any {
	return map[string]any{
		"required":    []string{"title"},
		"recommended": []string{"tagline", "problem", "approach", "outcome", "techStack", "liveUrl", "repoUrl"},
		"fields": map[string]any{
			"title":     "Project name — clear and specific.",
			"tagline":   "One-line hook (what it does).",
			"problem":   "What problem or need did this address?",
			"approach":  "What did you build and how?",
			"outcome":   "Measurable result or impact.",
			"techStack": "Array of technologies used.",
			"liveUrl":   "Live demo URL.",
			"repoUrl":   "Source code URL.",
			"featured":  "true for hero/featured project.",
		},
		"goodExample": map[string]any{
			"title":     "Stylette",
			"tagline":   "AI wardrobe assistant that suggests outfits from your closet.",
			"problem":   "People waste time deciding what to wear each morning.",
			"approach":  "Built a Next.js app with vision models to tag clothing and recommend combos.",
			"outcome":   "500+ beta users; 40% daily return rate in week one.",
			"techStack": []string{"Next.js", "TypeScript", "OpenAI"},
			"liveUrl":   "https://stylette.app",
			"repoUrl":   "https://github.com/jane/stylette",
		},
		"badExample": map[string]any{
			"title":   "Project",
			"tagline": "A cool app I made.",
			"problem": "N/A",
		},
		"notes": "Use PAR (Problem → Approach → Result) for case studies. Curate 3–5 strong projects, not a long list.",
	}
}

func portfolioSkillFieldGuide() map[string]any {
	return map[string]any{
		"required":    []string{"name"},
		"recommended": []string{"category"},
		"fields": map[string]any{
			"name":     "Skill name (one per item).",
			"category": "Optional group: Languages, Frameworks, Tools, etc.",
		},
		"notes": "Showcase skills relevant to the portfolio audience — group by category when helpful.",
	}
}

func portfolioTestimonialFieldGuide() map[string]any {
	return map[string]any{
		"required":    []string{"quote"},
		"recommended": []string{"author", "role"},
		"fields": map[string]any{
			"quote":  "What they said about working with you.",
			"author": "Person's name.",
			"role":   "Their title or relationship.",
		},
		"notes": "Only add real testimonials the user provided — never invent quotes.",
	}
}

func collectPortfolioProjectFieldHints(project *model.PortfolioProject) []string {
	if project == nil {
		return []string{"Add a project title."}
	}
	hints := make([]string, 0)
	if project.Tagline == "" {
		hints = append(hints, "Add a short tagline describing what the project does.")
	}
	if project.Problem == "" {
		hints = append(hints, "Add the problem this project solved.")
	}
	if project.Outcome == "" {
		hints = append(hints, "Add a measurable outcome or result.")
	}
	return hints
}
