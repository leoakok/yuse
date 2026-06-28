package twin

import (
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

const (
	MetaStoryFormat = "storyFormat"
	MetaSituation   = "situation"
	MetaTask        = "task"
	MetaProblem     = "problem"
	MetaAction      = "action"
	MetaResult      = "result"
)

// FlatMetadataKeys are promoted to top-level MCP tool parameters and stored in metadata.
var FlatMetadataKeys = []string{
	"company", "institution", "location", "startDate", "endDate", "url", "level",
	MetaStoryFormat, MetaSituation, MetaTask, MetaProblem, MetaAction, MetaResult,
}

type StoryFormat string

const (
	StorySTAR StoryFormat = "STAR"
	StoryPAR  StoryFormat = "PAR"
)

func metaString(meta map[string]any, key string) string {
	if meta == nil {
		return ""
	}
	v, ok := meta[key]
	if !ok || v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(v))
}

func InferStoryFormat(entryType model.TwinEntryType, meta map[string]any) StoryFormat {
	if f := StoryFormat(metaString(meta, MetaStoryFormat)); f == StorySTAR || f == StoryPAR {
		return f
	}
	switch entryType {
	case model.TwinEntryTypeExperience, model.TwinEntryTypeEducation:
		return StorySTAR
	case model.TwinEntryTypeProject, model.TwinEntryTypeSkillArea:
		return StoryPAR
	default:
		if metaString(meta, MetaProblem) != "" {
			return StoryPAR
		}
		return StorySTAR
	}
}

func MissingElements(entry *model.TwinEntry) []string {
	if entry == nil {
		return nil
	}
	format := InferStoryFormat(entry.Type, entry.Metadata)
	var missing []string
	switch format {
	case StoryPAR:
		if metaString(entry.Metadata, MetaProblem) == "" {
			missing = append(missing, "problem")
		}
		if metaString(entry.Metadata, MetaAction) == "" {
			missing = append(missing, "action")
		}
		if metaString(entry.Metadata, MetaResult) == "" {
			missing = append(missing, "result")
		}
	default:
		if metaString(entry.Metadata, MetaSituation) == "" {
			missing = append(missing, "situation")
		}
		if metaString(entry.Metadata, MetaTask) == "" {
			missing = append(missing, "task")
		}
		if metaString(entry.Metadata, MetaAction) == "" {
			missing = append(missing, "action")
		}
		if metaString(entry.Metadata, MetaResult) == "" {
			missing = append(missing, "result")
		}
	}
	return missing
}

func IsComplete(entry *model.TwinEntry) bool {
	return len(MissingElements(entry)) == 0
}

func FormatEntryLine(entry *model.TwinEntry) string {
	if entry == nil {
		return ""
	}
	var b strings.Builder
	b.WriteString(fmt.Sprintf("[%s] %s", entry.Type, entry.Title))

	if company := metaString(entry.Metadata, "company"); company != "" {
		b.WriteString(fmt.Sprintf(" @ %s", company))
	}
	if inst := metaString(entry.Metadata, "institution"); inst != "" {
		b.WriteString(fmt.Sprintf(" @ %s", inst))
	}

	format := InferStoryFormat(entry.Type, entry.Metadata)
	b.WriteString(fmt.Sprintf(" (%s", format))
	if missing := MissingElements(entry); len(missing) > 0 {
		b.WriteString(fmt.Sprintf("; missing: %s", strings.Join(missing, ", ")))
	} else {
		b.WriteString("; complete")
	}
	b.WriteString(")")

	appendField := func(label, key string) {
		if v := metaString(entry.Metadata, key); v != "" {
			b.WriteString(fmt.Sprintf("\n  %s: %s", label, truncate(v, 200)))
		}
	}

	switch format {
	case StoryPAR:
		appendField("Problem", MetaProblem)
		appendField("Action", MetaAction)
		appendField("Result", MetaResult)
	default:
		appendField("Situation", MetaSituation)
		appendField("Task", MetaTask)
		appendField("Action", MetaAction)
		appendField("Result", MetaResult)
	}

	if body := strings.TrimSpace(entry.Body); body != "" {
		b.WriteString(fmt.Sprintf("\n  summary: %s", truncate(body, 300)))
	}

	return b.String()
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
