package store

import (
	"encoding/json"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

const resumeSettingsSelectSQL = `
	SELECT resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
		contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
		page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, item_title_separator,
		item_title_order, font_family, accent_color, section_divider_style,
		date_format, date_position, skills_layout, ats_mode,
		column_layout, sidebar_position, sidebar_width, design_preset_id, photo_position, photo_size,
		contact_layout, contact_fields,
		section_spacing, item_spacing, description_style, bullet_char, item_title_emphasis,
		highlight_current_role, location_display, heading_font_family, body_font_family,
		name_font_weight, section_title_font_weight, line_height, heading_letter_spacing,
		section_title_case, text_primary_color, text_muted_color, page_background, link_color,
		skills_proficiency, languages_layout, certifications_layout, keep_sections_together,
		max_items_before_break, footer_style, export_filename_template, locale
	FROM resume_settings WHERE resume_id = $1`

const resumeSettingsUpsertSQL = `
	INSERT INTO resume_settings (
		resume_id, theme_id, font_size, contact_name_font_size, contact_headline_font_size,
		contact_details_font_size, section_title_font_size, item_title_font_size, item_meta_font_size,
		page_format, margin_horizontal_mm, margin_vertical_mm, show_photo, item_title_layout, item_title_separator, item_title_order,
		font_family, accent_color, section_divider_style, date_format, date_position, skills_layout, ats_mode,
		column_layout, sidebar_position, sidebar_width, design_preset_id, photo_position, photo_size,
		contact_layout, contact_fields,
		section_spacing, item_spacing, description_style, bullet_char, item_title_emphasis,
		highlight_current_role, location_display, heading_font_family, body_font_family,
		name_font_weight, section_title_font_weight, line_height, heading_letter_spacing,
		section_title_case, text_primary_color, text_muted_color, page_background, link_color,
		skills_proficiency, languages_layout, certifications_layout, keep_sections_together,
		max_items_before_break, footer_style, export_filename_template, locale
	)
	VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
		$20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
		$32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49,
		$50, $51, $52, $53, $54, $55, $56, $57
	)
	ON CONFLICT (resume_id) DO UPDATE SET
		theme_id = EXCLUDED.theme_id,
		font_size = EXCLUDED.font_size,
		contact_name_font_size = EXCLUDED.contact_name_font_size,
		contact_headline_font_size = EXCLUDED.contact_headline_font_size,
		contact_details_font_size = EXCLUDED.contact_details_font_size,
		section_title_font_size = EXCLUDED.section_title_font_size,
		item_title_font_size = EXCLUDED.item_title_font_size,
		item_meta_font_size = EXCLUDED.item_meta_font_size,
		page_format = EXCLUDED.page_format,
		margin_horizontal_mm = EXCLUDED.margin_horizontal_mm,
		margin_vertical_mm = EXCLUDED.margin_vertical_mm,
		show_photo = EXCLUDED.show_photo,
		item_title_layout = EXCLUDED.item_title_layout,
		item_title_separator = EXCLUDED.item_title_separator,
		item_title_order = EXCLUDED.item_title_order,
		font_family = EXCLUDED.font_family,
		accent_color = EXCLUDED.accent_color,
		section_divider_style = EXCLUDED.section_divider_style,
		date_format = EXCLUDED.date_format,
		date_position = EXCLUDED.date_position,
		skills_layout = EXCLUDED.skills_layout,
		ats_mode = EXCLUDED.ats_mode,
		column_layout = EXCLUDED.column_layout,
		sidebar_position = EXCLUDED.sidebar_position,
		sidebar_width = EXCLUDED.sidebar_width,
		design_preset_id = EXCLUDED.design_preset_id,
		photo_position = EXCLUDED.photo_position,
		photo_size = EXCLUDED.photo_size,
		contact_layout = EXCLUDED.contact_layout,
		contact_fields = EXCLUDED.contact_fields,
		section_spacing = EXCLUDED.section_spacing,
		item_spacing = EXCLUDED.item_spacing,
		description_style = EXCLUDED.description_style,
		bullet_char = EXCLUDED.bullet_char,
		item_title_emphasis = EXCLUDED.item_title_emphasis,
		highlight_current_role = EXCLUDED.highlight_current_role,
		location_display = EXCLUDED.location_display,
		heading_font_family = EXCLUDED.heading_font_family,
		body_font_family = EXCLUDED.body_font_family,
		name_font_weight = EXCLUDED.name_font_weight,
		section_title_font_weight = EXCLUDED.section_title_font_weight,
		line_height = EXCLUDED.line_height,
		heading_letter_spacing = EXCLUDED.heading_letter_spacing,
		section_title_case = EXCLUDED.section_title_case,
		text_primary_color = EXCLUDED.text_primary_color,
		text_muted_color = EXCLUDED.text_muted_color,
		page_background = EXCLUDED.page_background,
		link_color = EXCLUDED.link_color,
		skills_proficiency = EXCLUDED.skills_proficiency,
		languages_layout = EXCLUDED.languages_layout,
		certifications_layout = EXCLUDED.certifications_layout,
		keep_sections_together = EXCLUDED.keep_sections_together,
		max_items_before_break = EXCLUDED.max_items_before_break,
		footer_style = EXCLUDED.footer_style,
		export_filename_template = EXCLUDED.export_filename_template,
		locale = EXCLUDED.locale`

func resumeSettingsArgs(settings *model.ResumeSettings) []any {
	return []any{
		settings.ResumeID, settings.ThemeID, string(settings.FontSize),
		string(settings.ContactNameFontSize), string(settings.ContactHeadlineFontSize),
		string(settings.ContactDetailsFontSize), string(settings.SectionTitleFontSize),
		string(settings.ItemTitleFontSize), string(settings.ItemMetaFontSize),
		string(settings.PageFormat),
		settings.MarginHorizontalMm, settings.MarginVerticalMm, settings.ShowPhoto,
		string(settings.ItemTitleLayout), string(settings.ItemTitleSeparator), string(settings.ItemTitleOrder),
		string(settings.FontFamily), settings.AccentColor, string(settings.SectionDividerStyle),
		string(settings.DateFormat), string(settings.DatePosition), string(settings.SkillsLayout), settings.AtsMode,
		string(settings.ColumnLayout), string(settings.SidebarPosition), string(settings.SidebarWidth),
		string(settings.DesignPresetID), string(settings.PhotoPosition), string(settings.PhotoSize),
		string(settings.ContactLayout), encodeContactFields(settings.ContactFields),
		string(settings.SectionSpacing), string(settings.ItemSpacing), string(settings.DescriptionStyle),
		string(settings.BulletChar), string(settings.ItemTitleEmphasis),
		settings.HighlightCurrentRole, string(settings.LocationDisplay),
		string(settings.HeadingFontFamily), string(settings.BodyFontFamily),
		string(settings.NameFontWeight), string(settings.SectionTitleFontWeight),
		string(settings.LineHeight), string(settings.HeadingLetterSpacing),
		string(settings.SectionTitleCase), settings.TextPrimaryColor, settings.TextMutedColor,
		string(settings.PageBackground), settings.LinkColor,
		string(settings.SkillsProficiency), string(settings.LanguagesLayout), string(settings.CertificationsLayout),
		settings.KeepSectionsTogether, settings.MaxItemsBeforeBreak,
		string(settings.FooterStyle), settings.ExportFilenameTemplate, settings.Locale,
	}
}

func scanResumeSettings(row scannable) (*model.ResumeSettings, error) {
	var s model.ResumeSettings
	var fontSize, contactNameFontSize, contactHeadlineFontSize, contactDetailsFontSize string
	var sectionTitleFontSize, itemTitleFontSize, itemMetaFontSize, pageFormat string
	var itemTitleLayout, itemTitleSeparator, itemTitleOrder, fontFamily, sectionDividerStyle string
	var dateFormat, datePosition, skillsLayout string
	var columnLayout, sidebarPosition, sidebarWidth, designPresetID string
	var photoPosition, photoSize, contactLayout string
	var contactFieldsJSON []byte
	var sectionSpacing, itemSpacing, descriptionStyle, bulletChar, itemTitleEmphasis string
	var locationDisplay, headingFontFamily, bodyFontFamily string
	var nameFontWeight, sectionTitleFontWeight, lineHeight, headingLetterSpacing, sectionTitleCase string
	var pageBackground, skillsProficiency, languagesLayout, certificationsLayout, footerStyle string

	if err := row.Scan(
		&s.ResumeID, &s.ThemeID, &fontSize, &contactNameFontSize, &contactHeadlineFontSize,
		&contactDetailsFontSize, &sectionTitleFontSize, &itemTitleFontSize, &itemMetaFontSize,
		&pageFormat, &s.MarginHorizontalMm, &s.MarginVerticalMm, &s.ShowPhoto,
		&itemTitleLayout, &itemTitleSeparator, &itemTitleOrder, &fontFamily, &s.AccentColor, &sectionDividerStyle,
		&dateFormat, &datePosition, &skillsLayout, &s.AtsMode,
		&columnLayout, &sidebarPosition, &sidebarWidth, &designPresetID, &photoPosition, &photoSize,
		&contactLayout, &contactFieldsJSON,
		&sectionSpacing, &itemSpacing, &descriptionStyle, &bulletChar, &itemTitleEmphasis,
		&s.HighlightCurrentRole, &locationDisplay, &headingFontFamily, &bodyFontFamily,
		&nameFontWeight, &sectionTitleFontWeight, &lineHeight, &headingLetterSpacing,
		&sectionTitleCase, &s.TextPrimaryColor, &s.TextMutedColor, &pageBackground, &s.LinkColor,
		&skillsProficiency, &languagesLayout, &certificationsLayout, &s.KeepSectionsTogether,
		&s.MaxItemsBeforeBreak, &footerStyle, &s.ExportFilenameTemplate, &s.Locale,
	); err != nil {
		return nil, err
	}

	s.FontSize = normalizeFontSize(fontSize)
	s.ContactNameFontSize = normalizeFontSize(contactNameFontSize)
	s.ContactHeadlineFontSize = normalizeFontSize(contactHeadlineFontSize)
	s.ContactDetailsFontSize = normalizeFontSize(contactDetailsFontSize)
	s.SectionTitleFontSize = normalizeFontSize(sectionTitleFontSize)
	s.ItemTitleFontSize = normalizeFontSize(itemTitleFontSize)
	s.ItemMetaFontSize = normalizeFontSize(itemMetaFontSize)
	s.PageFormat = model.PageFormat(pageFormat)
	if !s.PageFormat.IsValid() {
		s.PageFormat = model.PageFormatA4
	}
	s.ItemTitleLayout = normalizeItemTitleLayout(itemTitleLayout)
	s.ItemTitleSeparator = normalizeItemTitleSeparator(itemTitleSeparator)
	s.ItemTitleOrder = normalizeItemTitleOrder(itemTitleOrder)
	s.FontFamily = normalizeFontFamily(fontFamily)
	s.SectionDividerStyle = normalizeSectionDividerStyle(sectionDividerStyle)
	s.DateFormat = normalizeDateFormat(dateFormat)
	s.DatePosition = normalizeDatePosition(datePosition)
	s.SkillsLayout = normalizeSkillsLayout(skillsLayout)
	s.ColumnLayout = normalizeColumnLayout(columnLayout)
	s.SidebarPosition = normalizeSidebarPosition(sidebarPosition)
	s.SidebarWidth = normalizeSidebarWidth(sidebarWidth)
	s.DesignPresetID = normalizeDesignPresetID(designPresetID)
	s.PhotoPosition = normalizePhotoPosition(photoPosition)
	s.PhotoSize = normalizePhotoSize(photoSize)
	s.ContactLayout = normalizeContactLayout(contactLayout)
	s.ContactFields = parseContactFields(contactFieldsJSON)
	s.SectionSpacing = normalizeSpacingDensity(sectionSpacing)
	s.ItemSpacing = normalizeSpacingDensity(itemSpacing)
	s.DescriptionStyle = normalizeDescriptionStyle(descriptionStyle)
	s.BulletChar = normalizeBulletChar(bulletChar)
	s.ItemTitleEmphasis = normalizeItemTitleEmphasis(itemTitleEmphasis)
	s.LocationDisplay = normalizeLocationDisplay(locationDisplay)
	s.HeadingFontFamily = normalizeFontFamily(headingFontFamily)
	s.BodyFontFamily = normalizeFontFamily(bodyFontFamily)
	s.NameFontWeight = normalizeFontWeightRole(nameFontWeight)
	s.SectionTitleFontWeight = normalizeFontWeightRole(sectionTitleFontWeight)
	s.LineHeight = normalizeLineHeightDensity(lineHeight)
	s.HeadingLetterSpacing = normalizeLetterSpacingDensity(headingLetterSpacing)
	s.SectionTitleCase = normalizeSectionTitleCase(sectionTitleCase)
	s.PageBackground = normalizePageBackground(pageBackground)
	s.SkillsProficiency = normalizeSkillsProficiency(skillsProficiency)
	s.LanguagesLayout = normalizeLanguagesLayout(languagesLayout)
	s.CertificationsLayout = normalizeCertificationsLayout(certificationsLayout)
	s.FooterStyle = normalizeFooterStyle(footerStyle)

	if strings.TrimSpace(s.AccentColor) == "" {
		s.AccentColor = "#c45c3e"
	}
	if strings.TrimSpace(s.ExportFilenameTemplate) == "" {
		s.ExportFilenameTemplate = "{name}-resume"
	}

	return cloneResumeSettings(&s), nil
}

func parseContactFields(raw []byte) []model.ContactField {
	if len(raw) == 0 {
		return defaultContactFields()
	}
	var fields []string
	if err := json.Unmarshal(raw, &fields); err != nil {
		return defaultContactFields()
	}
	out := make([]model.ContactField, 0, len(fields))
	for _, f := range fields {
		field := model.ContactField(strings.ToUpper(strings.TrimSpace(f)))
		if field.IsValid() {
			out = append(out, field)
		}
	}
	if len(out) == 0 {
		return defaultContactFields()
	}
	return out
}

func defaultContactFields() []model.ContactField {
	return []model.ContactField{
		model.ContactFieldEmail,
		model.ContactFieldPhone,
		model.ContactFieldLocation,
		model.ContactFieldWebsite,
	}
}

func normalizeItemTitleLayout(raw string) model.ItemTitleLayout {
	v := model.ItemTitleLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ItemTitleLayoutStacked
}

func normalizeItemTitleSeparator(raw string) model.ItemTitleSeparator {
	v := model.ItemTitleSeparator(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ItemTitleSeparatorDot
}

func normalizeItemTitleOrder(raw string) model.ItemTitleOrder {
	v := model.ItemTitleOrder(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ItemTitleOrderTitleFirst
}

func normalizeSectionDividerStyle(raw string) model.SectionDividerStyle {
	v := model.SectionDividerStyle(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SectionDividerStyleFull
}

func normalizeDateFormat(raw string) model.DateFormat {
	v := model.DateFormat(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.DateFormatMonYyyy
}

func normalizeDatePosition(raw string) model.DatePosition {
	v := model.DatePosition(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.DatePositionRight
}

func normalizeSkillsLayout(raw string) model.SkillsLayout {
	v := model.SkillsLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SkillsLayoutList
}

func normalizeColumnLayout(raw string) model.ColumnLayout {
	v := model.ColumnLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ColumnLayoutSingle
}

func normalizeSidebarPosition(raw string) model.SidebarPosition {
	v := model.SidebarPosition(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SidebarPositionLeft
}

func normalizeSidebarWidth(raw string) model.SidebarWidth {
	v := model.SidebarWidth(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SidebarWidthMedium
}

func normalizeDesignPresetID(raw string) model.DesignPresetID {
	v := model.DesignPresetID(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.DesignPresetIDModern
}

func normalizePhotoPosition(raw string) model.PhotoPosition {
	v := model.PhotoPosition(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.PhotoPositionHeaderLeft
}

func normalizePhotoSize(raw string) model.PhotoSize {
	v := model.PhotoSize(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.PhotoSizeM
}

func normalizeContactLayout(raw string) model.ContactLayout {
	v := model.ContactLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ContactLayoutInline
}

func normalizeSpacingDensity(raw string) model.SpacingDensity {
	v := model.SpacingDensity(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SpacingDensityNormal
}

func normalizeDescriptionStyle(raw string) model.DescriptionStyle {
	v := model.DescriptionStyle(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.DescriptionStyleBullets
}

func normalizeBulletChar(raw string) model.BulletChar {
	v := model.BulletChar(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.BulletCharDot
}

func normalizeItemTitleEmphasis(raw string) model.ItemTitleEmphasis {
	v := model.ItemTitleEmphasis(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.ItemTitleEmphasisTitle
}

func normalizeLocationDisplay(raw string) model.LocationDisplay {
	v := model.LocationDisplay(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.LocationDisplayOwnLine
}

func normalizeFontWeightRole(raw string) model.FontWeightRole {
	v := model.FontWeightRole(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.FontWeightRoleSemibold
}

func normalizeLineHeightDensity(raw string) model.LineHeightDensity {
	v := model.LineHeightDensity(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.LineHeightDensityNormal
}

func normalizeLetterSpacingDensity(raw string) model.LetterSpacingDensity {
	v := model.LetterSpacingDensity(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.LetterSpacingDensityNormal
}

func normalizePageBackground(raw string) model.PageBackground {
	v := model.PageBackground(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.PageBackgroundWhite
}

func normalizeSkillsProficiency(raw string) model.SkillsProficiency {
	v := model.SkillsProficiency(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SkillsProficiencyNone
}

func normalizeLanguagesLayout(raw string) model.LanguagesLayout {
	v := model.LanguagesLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.LanguagesLayoutList
}

func normalizeCertificationsLayout(raw string) model.CertificationsLayout {
	v := model.CertificationsLayout(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.CertificationsLayoutList
}

func normalizeSectionTitleCase(raw string) model.SectionTitleCase {
	v := model.SectionTitleCase(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.SectionTitleCaseCapitalize
}

func normalizeFooterStyle(raw string) model.FooterStyle {
	v := model.FooterStyle(strings.ToUpper(strings.TrimSpace(raw)))
	if v.IsValid() {
		return v
	}
	return model.FooterStyleNone
}
