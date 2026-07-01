package mcp

import (
	"context"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func (r *Registry) executePortfolioTool(toolName string, args map[string]any, exec *Execution) bool {
	switch toolName {
	case "list_portfolios":
		exec.Result = r.exec.ListPortfolios()
		return true

	case "get_portfolio":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		portfolio, err := r.exec.GetPortfolio(id)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolio
		return true

	case "create_portfolio":
		title, _ := optionalString(args, "title")
		portfolio := r.exec.CreatePortfolio(title)
		exec.Result = portfolio
		exec.AffectedPortfolioIDs = []string{portfolio.ID}
		return true

	case "duplicate_portfolio":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		portfolio, err := r.exec.DuplicatePortfolio(id)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolio
		exec.AffectedPortfolioIDs = []string{portfolio.ID}
		return true

	case "delete_portfolio":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		ok, err := r.exec.DeletePortfolio(id)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = map[string]any{"deleted": ok, "id": id}
		return true

	case "update_portfolio":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		title, _ := optionalString(args, "title")
		tagline, _ := optionalString(args, "tagline")
		about, _ := optionalString(args, "about")
		var titlePtr, taglinePtr, aboutPtr *string
		if title != "" {
			titlePtr = &title
		}
		if tagline != "" {
			taglinePtr = &tagline
		}
		if about != "" {
			aboutPtr = &about
		}
		portfolio, err := r.exec.UpdatePortfolio(id, titlePtr, taglinePtr, aboutPtr, nil)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolio
		exec.AffectedPortfolioIDs = []string{portfolio.ID}
		return true

	case "get_portfolio_content":
		id, err := requireString(args, "id")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		content, err := r.exec.GetPortfolioWithContent(id)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		return true

	case "update_portfolio_contact_profile":
		applyArgAlias(args, "portfolioId", "portfolio_id")
		applyArgAlias(args, "fullName", "name")
		applyArgAlias(args, "headline", "title", "professionalTitle")
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioContactProfileInput{PortfolioID: portfolioID}
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
		content, err := r.exec.UpdatePortfolioContactProfile(context.Background(), input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = map[string]any{
			"portfolioId":    portfolioID,
			"contactProfile": contactProfileFromPortfolioContent(content),
			"fieldHints":     contactProfileFieldHints(args),
		}
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "add_portfolio_project":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		title, err := requireString(args, "title")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.AddPortfolioProjectInput{
			PortfolioID: portfolioID,
			Title:       title,
			Tagline:     optionalStringPtr(args, "tagline"),
			Problem:     optionalStringPtr(args, "problem"),
			Approach:    optionalStringPtr(args, "approach"),
			Outcome:     optionalStringPtr(args, "outcome"),
			LiveURL:     optionalStringPtr(args, "liveUrl"),
			RepoURL:     optionalStringPtr(args, "repoUrl"),
			ImageURL:    optionalStringPtr(args, "imageUrl"),
			Featured:    optionalBoolPtr(args, "featured"),
		}
		if stack, ok := optionalStringSlice(args, "techStack"); ok {
			input.TechStack = stack
		}
		content, err := r.exec.AddPortfolioProject(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = wrapPortfolioProjectWriteResult(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_project":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		projectID, err := requireString(args, "projectId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioProjectInput{
			PortfolioID: portfolioID,
			ProjectID:   projectID,
			Title:       optionalStringPtr(args, "title"),
			Tagline:     optionalStringPtr(args, "tagline"),
			Problem:     optionalStringPtr(args, "problem"),
			Approach:    optionalStringPtr(args, "approach"),
			Outcome:     optionalStringPtr(args, "outcome"),
			LiveURL:     optionalStringPtr(args, "liveUrl"),
			RepoURL:     optionalStringPtr(args, "repoUrl"),
			ImageURL:    optionalStringPtr(args, "imageUrl"),
			Featured:    optionalBoolPtr(args, "featured"),
			ShowInPreview: optionalBoolPtr(args, "showInPreview"),
		}
		if stack, ok := optionalStringSlice(args, "techStack"); ok {
			input.TechStack = stack
		}
		content, err := r.exec.UpdatePortfolioProject(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = wrapPortfolioProjectWriteResult(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "delete_portfolio_project":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		projectID, err := requireString(args, "projectId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		content, err := r.exec.DeletePortfolioProject(portfolioID, projectID)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "add_portfolio_skill":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		name, err := requireString(args, "name")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.AddPortfolioSkillInput{
			PortfolioID: portfolioID,
			Name:        name,
			Category:    optionalStringPtr(args, "category"),
		}
		content, err := r.exec.AddPortfolioSkill(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_skill":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		skillID, err := requireString(args, "skillId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioSkillInput{
			PortfolioID:   portfolioID,
			SkillID:       skillID,
			Name:          optionalStringPtr(args, "name"),
			Category:      optionalStringPtr(args, "category"),
			ShowInPreview: optionalBoolPtr(args, "showInPreview"),
		}
		content, err := r.exec.UpdatePortfolioSkill(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "delete_portfolio_skill":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		skillID, err := requireString(args, "skillId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		content, err := r.exec.DeletePortfolioSkill(portfolioID, skillID)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "add_portfolio_testimonial":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		quote, err := requireString(args, "quote")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.AddPortfolioTestimonialInput{
			PortfolioID: portfolioID,
			Quote:       quote,
			Author:      optionalStringPtr(args, "author"),
			Role:        optionalStringPtr(args, "role"),
		}
		content, err := r.exec.AddPortfolioTestimonial(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_testimonial":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		testimonialID, err := requireString(args, "testimonialId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioTestimonialInput{
			PortfolioID:   portfolioID,
			TestimonialID: testimonialID,
			Quote:         optionalStringPtr(args, "quote"),
			Author:        optionalStringPtr(args, "author"),
			Role:          optionalStringPtr(args, "role"),
			ShowInPreview: optionalBoolPtr(args, "showInPreview"),
		}
		content, err := r.exec.UpdatePortfolioTestimonial(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "delete_portfolio_testimonial":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		testimonialID, err := requireString(args, "testimonialId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		content, err := r.exec.DeletePortfolioTestimonial(portfolioID, testimonialID)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = portfolioContentSummary(content)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_settings":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioSettingsInput{PortfolioID: portfolioID}
		if v, ok := optionalEnum(args, "layout"); ok {
			layout := model.PortfolioLayout(v)
			if layout.IsValid() {
				input.Layout = &layout
			}
		}
		if v, ok := optionalString(args, "accentColor"); ok && v != "" {
			input.AccentColor = &v
		}
		if v, ok := optionalString(args, "themeId"); ok && v != "" {
			input.ThemeID = &v
		}
		if v, ok := optionalBool(args, "showPhoto"); ok {
			input.ShowPhoto = &v
		}
		if v, ok := optionalString(args, "locale"); ok && v != "" {
			input.Locale = &v
		}
		if v, ok := optionalEnum(args, "projectGridColumns"); ok {
			cols := model.PortfolioProjectGridColumns(v)
			if cols.IsValid() {
				input.ProjectGridColumns = &cols
			}
		}
		if v, ok := optionalEnum(args, "projectCardStyle"); ok {
			style := model.PortfolioProjectCardStyle(v)
			if style.IsValid() {
				input.ProjectCardStyle = &style
			}
		}
		if v, ok := optionalEnum(args, "typographyScale"); ok {
			scale := model.PortfolioTypographyScale(v)
			if scale.IsValid() {
				input.TypographyScale = &scale
			}
		}
		if v, ok := optionalEnum(args, "heroStyle"); ok {
			hero := model.PortfolioHeroStyle(v)
			if hero.IsValid() {
				input.HeroStyle = &hero
			}
		}
		if v, ok := optionalEnum(args, "navigationStyle"); ok {
			nav := model.PortfolioNavigationStyle(v)
			if nav.IsValid() {
				input.NavigationStyle = &nav
			}
		}
		if v, ok := optionalEnum(args, "animationLevel"); ok {
			anim := model.PortfolioAnimationLevel(v)
			if anim.IsValid() {
				input.AnimationLevel = &anim
			}
		}
		settings, err := r.exec.UpdatePortfolioSettings(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = settings
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true
	}
	return false
}

func portfolioContentSummary(content *model.PortfolioWithContent) map[string]any {
	out := map[string]any{
		"portfolioId":    content.Portfolio.ID,
		"portfolioTitle": content.Portfolio.Title,
		"tagline":        content.Portfolio.Tagline,
		"about":          content.Portfolio.About,
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
		out["contactProfileNote"] = "Profile header not set yet, use update_portfolio_contact_profile."
	}
	projects := make([]map[string]any, 0, len(content.Projects))
	for _, proj := range content.Projects {
		projects = append(projects, map[string]any{
			"id":            proj.ID,
			"title":         proj.Title,
			"tagline":       proj.Tagline,
			"problem":       proj.Problem,
			"approach":      proj.Approach,
			"outcome":       proj.Outcome,
			"techStack":     proj.TechStack,
			"liveUrl":       proj.LiveURL,
			"repoUrl":       proj.RepoURL,
			"featured":      proj.Featured,
			"showInPreview": proj.ShowInPreview,
		})
	}
	skills := make([]map[string]any, 0, len(content.Skills))
	for _, skill := range content.Skills {
		skills = append(skills, map[string]any{
			"id":            skill.ID,
			"name":          skill.Name,
			"category":      skill.Category,
			"showInPreview": skill.ShowInPreview,
		})
	}
	testimonials := make([]map[string]any, 0, len(content.Testimonials))
	for _, t := range content.Testimonials {
		testimonials = append(testimonials, map[string]any{
			"id":            t.ID,
			"quote":         t.Quote,
			"author":        t.Author,
			"role":          t.Role,
			"showInPreview": t.ShowInPreview,
		})
	}
	out["projects"] = projects
	out["skills"] = skills
	out["testimonials"] = testimonials
	out["projectFieldGuide"] = portfolioProjectFieldGuide()
	out["skillFieldGuide"] = portfolioSkillFieldGuide()
	out["testimonialFieldGuide"] = portfolioTestimonialFieldGuide()
	return out
}

func contactProfileFromPortfolioContent(content *model.PortfolioWithContent) any {
	if content == nil || content.ContactProfile == nil {
		return nil
	}
	cp := content.ContactProfile
	return map[string]any{
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
}

func wrapPortfolioProjectWriteResult(content *model.PortfolioWithContent) map[string]any {
	out := portfolioContentSummary(content)
	if len(content.Projects) > 0 {
		latest := content.Projects[len(content.Projects)-1]
		out["fieldHints"] = collectPortfolioProjectFieldHints(latest)
	}
	return out
}

func optionalStringSlice(args map[string]any, key string) ([]string, bool) {
	v, ok := args[key]
	if !ok || v == nil {
		return nil, false
	}
	switch arr := v.(type) {
	case []string:
		return arr, true
	case []any:
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out, true
	default:
		return nil, false
	}
}

func optionalBoolPtr(args map[string]any, key string) *bool {
	if v, ok := optionalBool(args, key); ok {
		return &v
	}
	return nil
}