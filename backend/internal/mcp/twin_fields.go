package mcp

import (
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	twinpkg "github.com/leo/ai-weekend/backend/internal/twin"
)

func mergeTwinFieldsIntoMetadata(args map[string]any) map[string]any {
	meta := optionalMetadataMap(args, "metadata")
	if meta == nil {
		meta = map[string]any{}
	}
	for _, key := range twinpkg.FlatMetadataKeys {
		mergeStringArgIntoMeta(args, meta, key)
	}
	if present, ok := optionalBool(args, "endDatePresent"); ok && present {
		if metaString(meta, "endDate") == "" {
			meta["endDate"] = "Present"
		}
	}
	if len(meta) > 0 {
		args["metadata"] = meta
	}
	return meta
}

func validateTwinEntryInput(entryType model.TwinEntryType, args map[string]any) error {
	meta := optionalMetadataMap(args, "metadata")
	format := twinpkg.InferStoryFormat(entryType, meta)
	if v, ok := optionalEnum(args, "storyFormat"); ok && v != "" {
		format = twinpkg.StoryFormat(v)
	}

	switch format {
	case twinpkg.StoryPAR:
		if metaString(meta, twinpkg.MetaProblem) == "" && metaString(meta, twinpkg.MetaAction) == "" {
			return nil // partial entries allowed — hints returned post-write
		}
	default:
		if metaString(meta, twinpkg.MetaSituation) == "" && metaString(meta, twinpkg.MetaAction) == "" {
			return nil
		}
	}
	return nil
}

func collectTwinEntryFieldHints(entryType model.TwinEntryType, args map[string]any) []string {
	meta := optionalMetadataMap(args, "metadata")
	format := twinpkg.InferStoryFormat(entryType, meta)
	if v, ok := optionalEnum(args, "storyFormat"); ok && v != "" {
		format = twinpkg.StoryFormat(v)
	}

	var hints []string
	switch entryType {
	case model.TwinEntryTypeExperience:
		if metaString(meta, "company") == "" {
			hints = append(hints, "set company=employer for EXPERIENCE twin entries")
		}
		if metaString(meta, "startDate") == "" {
			hints = append(hints, "set startDate for EXPERIENCE twin entries")
		}
	case model.TwinEntryTypeEducation:
		if metaString(meta, "institution") == "" {
			hints = append(hints, "set institution=school for EDUCATION twin entries")
		}
	case model.TwinEntryTypeSkillArea:
		if metaString(meta, "level") == "" {
			hints = append(hints, "set level enum for SKILL_AREA entries")
		}
	}

	switch format {
	case twinpkg.StoryPAR:
		if metaString(meta, twinpkg.MetaProblem) == "" {
			hints = append(hints, "PAR: fill problem=what was broken or needed")
		}
		if metaString(meta, twinpkg.MetaAction) == "" {
			hints = append(hints, "PAR: fill action=what you specifically did")
		}
		if metaString(meta, twinpkg.MetaResult) == "" {
			hints = append(hints, "PAR: fill result=measurable outcome")
		}
	default:
		if metaString(meta, twinpkg.MetaSituation) == "" {
			hints = append(hints, "STAR: fill situation=team/company context")
		}
		if metaString(meta, twinpkg.MetaTask) == "" {
			hints = append(hints, "STAR: fill task=your goal or responsibility")
		}
		if metaString(meta, twinpkg.MetaAction) == "" {
			hints = append(hints, "STAR: fill action=what you specifically did")
		}
		if metaString(meta, twinpkg.MetaResult) == "" {
			hints = append(hints, "STAR: fill result=measurable outcome")
		}
	}

	body, _ := optionalString(args, "body")
	if strings.TrimSpace(body) != "" && len(hints) > 0 {
		hints = append(hints, "prefer structured STAR/PAR fields over dumping story into body")
	}

	return dedupeStrings(hints)
}

func wrapTwinEntryResult(entry *model.TwinEntry, args map[string]any) map[string]any {
	if entry == nil {
		return nil
	}
	out := map[string]any{
		"id":        entry.ID,
		"type":      entry.Type,
		"title":     entry.Title,
		"body":      entry.Body,
		"sortOrder": entry.SortOrder,
	}
	if len(entry.Metadata) > 0 {
		out["metadata"] = entry.Metadata
		for _, key := range twinpkg.FlatMetadataKeys {
			if v, ok := entry.Metadata[key]; ok && fmt.Sprint(v) != "" {
				out[key] = v
			}
		}
	}
	out["fieldHints"] = collectTwinEntryFieldHints(entry.Type, args)
	out["storyFormat"] = string(twinpkg.InferStoryFormat(entry.Type, entry.Metadata))
	if missing := twinpkg.MissingElements(entry); len(missing) > 0 {
		out["missingSTARorPAR"] = missing
	}
	return out
}
