package sectionmeta

import "strings"

// Language levels stored in section item metadata.level (spoken languages).
const (
	LanguageLevelBeginner      = "BEGINNER"
	LanguageLevelIntermediate  = "INTERMEDIATE"
	LanguageLevelProficient    = "PROFICIENT"
	LanguageLevelFluent        = "FLUENT"
	LanguageLevelNative        = "NATIVE"
)

// Skill levels stored in section item metadata.level (technical/professional skills).
const (
	SkillLevelBeginner     = "BEGINNER"
	SkillLevelIntermediate = "INTERMEDIATE"
	SkillLevelProficient   = "PROFICIENT"
	SkillLevelAdvanced     = "ADVANCED"
	SkillLevelExpert       = "EXPERT"
)

var AllLanguageLevels = []string{
	LanguageLevelBeginner,
	LanguageLevelIntermediate,
	LanguageLevelProficient,
	LanguageLevelFluent,
	LanguageLevelNative,
}

var AllSkillLevels = []string{
	SkillLevelBeginner,
	SkillLevelIntermediate,
	SkillLevelProficient,
	SkillLevelAdvanced,
	SkillLevelExpert,
}

// AllProficiencyLevels is the union used by MCP tool enums (language + skill values).
var AllProficiencyLevels = []string{
	LanguageLevelBeginner,
	LanguageLevelIntermediate,
	LanguageLevelProficient,
	LanguageLevelFluent,
	LanguageLevelNative,
	SkillLevelAdvanced,
	SkillLevelExpert,
}

func FormatLevelLabel(level string) string {
	level = strings.TrimSpace(level)
	if level == "" {
		return ""
	}
	lower := strings.ToLower(level)
	return strings.ToUpper(lower[:1]) + lower[1:]
}

func IsLanguageLevel(level string) bool {
	for _, v := range AllLanguageLevels {
		if v == level {
			return true
		}
	}
	return false
}

func IsSkillLevel(level string) bool {
	for _, v := range AllSkillLevels {
		if v == level {
			return true
		}
	}
	return false
}
