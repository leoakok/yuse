package mcp

import (
	"context"
	"fmt"

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
		var titlePtr *string
		if title != "" {
			titlePtr = &title
		}
		portfolio, err := r.exec.UpdatePortfolio(id, titlePtr, nil)
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

	case "add_portfolio_section_item":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return true
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
			return true
		}
		input := model.AddPortfolioSectionItemInput{
			PortfolioID: portfolioID,
			SectionID:   sectionID,
			Headline:    optionalStringPtr(args, "headline"),
			Body:        optionalStringPtr(args, "body"),
			Metadata:    optionalMetadata(args, "metadata"),
		}
		content, err := r.exec.AddPortfolioSectionItem(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = wrapPortfolioSectionItemWriteResult(content, section, headline, body, metadata)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_section_item":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		sectionItemID, err := requireString(args, "sectionItemId")
		if err != nil {
			exec.Error = err.Error()
			return true
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
			return true
		}
		input := model.UpdatePortfolioSectionItemInput{
			PortfolioID:   portfolioID,
			SectionID:     sectionID,
			SectionItemID: sectionItemID,
			Headline:      optionalStringPtr(args, "headline"),
			Body:          optionalStringPtr(args, "body"),
			Metadata:      optionalMetadata(args, "metadata"),
		}
		content, err := r.exec.UpdatePortfolioSectionItem(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = wrapPortfolioSectionItemWriteResult(content, section, headline, body, metadata)
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "set_portfolio_item_visibility":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		sectionID, err := requireString(args, "sectionId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		sectionItemID, err := requireString(args, "sectionItemId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		show, err := requireBool(args, "showInPreview")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioSectionItemVisibilityInput{
			PortfolioID:   portfolioID,
			SectionID:     sectionID,
			SectionItemID: sectionItemID,
			ShowInPreview: show,
		}
		content, err := r.exec.UpdatePortfolioSectionItemVisibility(input)
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		exec.Result = content
		exec.AffectedPortfolioIDs = []string{portfolioID}
		return true

	case "update_portfolio_settings":
		portfolioID, err := requireString(args, "portfolioId")
		if err != nil {
			exec.Error = err.Error()
			return true
		}
		input := model.UpdatePortfolioSettingsInput{PortfolioID: portfolioID}
		if v, ok := optionalEnum(args, "pageFormat"); ok {
			pf := model.PageFormat(v)
			if pf.IsValid() {
				input.PageFormat = &pf
			}
		}
		if v, ok := optionalEnum(args, "fontSize"); ok {
			fs := model.FontSize(v)
			if fs.IsValid() {
				input.FontSize = &fs
			}
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
		if v, ok := optionalFloat(args, "marginHorizontalMm"); ok {
			input.MarginHorizontalMm = &v
		}
		if v, ok := optionalFloat(args, "marginVerticalMm"); ok {
			input.MarginVerticalMm = &v
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
	}
	if content.ContactProfile != nil {
		cp := content.ContactProfile
		out["contactProfile"] = map[string]any{
			"fullName": cp.FullName,
			"headline": cp.Headline,
			"email":    cp.Email,
			"phone":    cp.Phone,
			"location": cp.Location,
			"website":  cp.Website,
			"linkedIn": cp.LinkedIn,
			"github":   cp.Github,
			"photoUrl": cp.PhotoURL,
		}
	} else {
		out["contactProfile"] = nil
		out["contactProfileNote"] = "Profile header not set yet — use update_portfolio_contact_profile to create it."
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
		sections = append(sections, map[string]any{
			"sectionId":  swi.Section.ID,
			"type":       swi.Section.Type,
			"title":      swi.Section.Title,
			"fieldGuide": sectionItemFieldGuideObject(swi.Section.Type),
			"items":      items,
		})
	}
	out["sections"] = sections
	return out
}

func contactProfileFromPortfolioContent(content *model.PortfolioWithContent) any {
	if content == nil || content.ContactProfile == nil {
		return nil
	}
	cp := content.ContactProfile
	return map[string]any{
		"fullName": cp.FullName,
		"headline": cp.Headline,
		"email":    cp.Email,
		"phone":    cp.Phone,
		"location": cp.Location,
		"website":  cp.Website,
		"linkedIn": cp.LinkedIn,
		"github":   cp.Github,
		"photoUrl": cp.PhotoURL,
	}
}

func wrapPortfolioSectionItemWriteResult(
	content *model.PortfolioWithContent,
	section *model.Section,
	headline, body string,
	metadata map[string]any,
) map[string]any {
	out := portfolioContentSummary(content)
	if section != nil {
		out["sectionType"] = section.Type
		out["fieldHints"] = collectSectionItemFieldHints(section.Type, headline, body, metadata)
		out["fieldGuide"] = sectionItemFieldGuideObject(section.Type)
	}
	return out
}
