package mcp

import (
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func buildUpdateResumeSettingsInput(resumeID string, args map[string]any) model.UpdateResumeSettingsInput {
	input := model.UpdateResumeSettingsInput{ResumeID: resumeID}

	applyEnum(args, "pageFormat", func(v model.PageFormat) { input.PageFormat = &v })
	applyEnum(args, "fontSize", func(v model.FontSize) { input.FontSize = &v })
	applyEnum(args, "contactNameFontSize", func(v model.FontSize) { input.ContactNameFontSize = &v })
	applyEnum(args, "contactHeadlineFontSize", func(v model.FontSize) { input.ContactHeadlineFontSize = &v })
	applyEnum(args, "contactDetailsFontSize", func(v model.FontSize) { input.ContactDetailsFontSize = &v })
	applyEnum(args, "sectionTitleFontSize", func(v model.FontSize) { input.SectionTitleFontSize = &v })
	applyEnum(args, "itemTitleFontSize", func(v model.FontSize) { input.ItemTitleFontSize = &v })
	applyEnum(args, "itemMetaFontSize", func(v model.FontSize) { input.ItemMetaFontSize = &v })
	applyEnum(args, "itemTitleLayout", func(v model.ItemTitleLayout) { input.ItemTitleLayout = &v })
	applyEnum(args, "itemTitleSeparator", func(v model.ItemTitleSeparator) { input.ItemTitleSeparator = &v })
	applyEnum(args, "itemTitleOrder", func(v model.ItemTitleOrder) { input.ItemTitleOrder = &v })
	applyEnum(args, "fontFamily", func(v model.FontFamily) { input.FontFamily = &v })
	applyEnum(args, "sectionDividerStyle", func(v model.SectionDividerStyle) { input.SectionDividerStyle = &v })
	applyEnum(args, "dateFormat", func(v model.DateFormat) { input.DateFormat = &v })
	applyEnum(args, "datePosition", func(v model.DatePosition) { input.DatePosition = &v })
	applyEnum(args, "skillsLayout", func(v model.SkillsLayout) { input.SkillsLayout = &v })
	applyEnum(args, "columnLayout", func(v model.ColumnLayout) { input.ColumnLayout = &v })
	applyEnum(args, "sidebarPosition", func(v model.SidebarPosition) { input.SidebarPosition = &v })
	applyEnum(args, "sidebarWidth", func(v model.SidebarWidth) { input.SidebarWidth = &v })
	applyEnum(args, "designPresetId", func(v model.DesignPresetID) { input.DesignPresetID = &v })
	applyEnum(args, "photoPosition", func(v model.PhotoPosition) { input.PhotoPosition = &v })
	applyEnum(args, "photoSize", func(v model.PhotoSize) { input.PhotoSize = &v })
	applyEnum(args, "contactLayout", func(v model.ContactLayout) { input.ContactLayout = &v })
	applyEnum(args, "sectionSpacing", func(v model.SpacingDensity) { input.SectionSpacing = &v })
	applyEnum(args, "itemSpacing", func(v model.SpacingDensity) { input.ItemSpacing = &v })
	applyEnum(args, "descriptionStyle", func(v model.DescriptionStyle) { input.DescriptionStyle = &v })
	applyEnum(args, "bulletChar", func(v model.BulletChar) { input.BulletChar = &v })
	applyEnum(args, "itemTitleEmphasis", func(v model.ItemTitleEmphasis) { input.ItemTitleEmphasis = &v })
	applyEnum(args, "locationDisplay", func(v model.LocationDisplay) { input.LocationDisplay = &v })
	applyEnum(args, "headingFontFamily", func(v model.FontFamily) { input.HeadingFontFamily = &v })
	applyEnum(args, "bodyFontFamily", func(v model.FontFamily) { input.BodyFontFamily = &v })
	applyEnum(args, "nameFontWeight", func(v model.FontWeightRole) { input.NameFontWeight = &v })
	applyEnum(args, "sectionTitleFontWeight", func(v model.FontWeightRole) { input.SectionTitleFontWeight = &v })
	applyEnum(args, "lineHeight", func(v model.LineHeightDensity) { input.LineHeight = &v })
	applyEnum(args, "headingLetterSpacing", func(v model.LetterSpacingDensity) { input.HeadingLetterSpacing = &v })
	applyEnum(args, "sectionTitleCase", func(v model.SectionTitleCase) { input.SectionTitleCase = &v })
	applyEnum(args, "pageBackground", func(v model.PageBackground) { input.PageBackground = &v })
	applyEnum(args, "skillsProficiency", func(v model.SkillsProficiency) { input.SkillsProficiency = &v })
	applyEnum(args, "languagesLayout", func(v model.LanguagesLayout) { input.LanguagesLayout = &v })
	applyEnum(args, "certificationsLayout", func(v model.CertificationsLayout) { input.CertificationsLayout = &v })
	applyEnum(args, "footerStyle", func(v model.FooterStyle) { input.FooterStyle = &v })

	if v, ok := optionalString(args, "themeId"); ok && v != "" {
		input.ThemeID = &v
	}
	if v, ok := optionalString(args, "accentColor"); ok && v != "" {
		input.AccentColor = &v
	}
	if v, ok := optionalString(args, "textPrimaryColor"); ok && v != "" {
		input.TextPrimaryColor = &v
	}
	if v, ok := optionalString(args, "textMutedColor"); ok && v != "" {
		input.TextMutedColor = &v
	}
	if v, ok := optionalString(args, "linkColor"); ok && v != "" {
		input.LinkColor = &v
	}
	if v, ok := optionalString(args, "exportFilenameTemplate"); ok {
		input.ExportFilenameTemplate = &v
	}
	if v, ok := optionalString(args, "locale"); ok && v != "" {
		input.Locale = &v
	}
	if v, ok := optionalBool(args, "showPhoto"); ok {
		input.ShowPhoto = &v
	}
	if v, ok := optionalBool(args, "atsMode"); ok {
		input.AtsMode = &v
	}
	if v, ok := optionalBool(args, "highlightCurrentRole"); ok {
		input.HighlightCurrentRole = &v
	}
	if v, ok := optionalBool(args, "keepSectionsTogether"); ok {
		input.KeepSectionsTogether = &v
	}
	if v, ok := optionalFloat(args, "marginHorizontalMm"); ok {
		input.MarginHorizontalMm = &v
	}
	if v, ok := optionalFloat(args, "marginVerticalMm"); ok {
		input.MarginVerticalMm = &v
	}
	if v, ok := optionalInt(args, "maxItemsBeforeBreak"); ok {
		input.MaxItemsBeforeBreak = &v
	}
	if fields, ok := optionalContactFields(args, "contactFields"); ok {
		input.ContactFields = fields
	}

	return input
}

func applyEnum[T interface {
	~string
	IsValid() bool
}](args map[string]any, key string, set func(T)) {
	if v, ok := optionalEnum(args, key); ok && v != "" {
		e := T(v)
		if e.IsValid() {
			set(e)
		}
	}
}

func optionalContactFields(args map[string]any, key string) ([]model.ContactField, bool) {
	v, ok := args[key]
	if !ok || v == nil {
		return nil, false
	}
	switch arr := v.(type) {
	case []model.ContactField:
		return arr, true
	case []string:
		out := make([]model.ContactField, 0, len(arr))
		for _, s := range arr {
			f := model.ContactField(s)
			if f.IsValid() {
				out = append(out, f)
			}
		}
		return out, len(out) > 0
	case []any:
		out := make([]model.ContactField, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				f := model.ContactField(s)
				if f.IsValid() {
					out = append(out, f)
				}
			}
		}
		return out, len(out) > 0
	default:
		return nil, false
	}
}

func optionalStringSliceRequired(args map[string]any, key string) ([]string, error) {
	v, ok := args[key]
	if !ok || v == nil {
		return nil, fmt.Errorf("%s is required", key)
	}
	switch arr := v.(type) {
	case []string:
		if len(arr) == 0 {
			return nil, fmt.Errorf("%s must be a non-empty array", key)
		}
		return arr, nil
	case []any:
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, strings.TrimSpace(s))
			}
		}
		if len(out) == 0 {
			return nil, fmt.Errorf("%s must be a non-empty array", key)
		}
		return out, nil
	default:
		return nil, fmt.Errorf("%s must be an array of section ids", key)
	}
}
