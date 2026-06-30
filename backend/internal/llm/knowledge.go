package llm

import (
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
)

// maxInjectedEntries caps how many dictionary entries are injected so the main
// prompt stays small (and cheap).
const maxInjectedEntries = 4

// SelectKnowledge picks the dictionary entries to inject for a classification.
// Entries are ranked: same category first, then tag overlap. Disabled entries
// are assumed to be filtered out by the caller (store ListKnowledgeEntries).
func SelectKnowledge(entries []*model.KnowledgeEntry, class Classification) []*model.KnowledgeEntry {
	if len(entries) == 0 {
		return nil
	}
	wantTags := make(map[string]bool, len(class.Tags))
	for _, t := range class.Tags {
		wantTags[strings.ToLower(strings.TrimSpace(t))] = true
	}

	type scored struct {
		entry *model.KnowledgeEntry
		score int
	}
	ranked := make([]scored, 0, len(entries))
	for _, e := range entries {
		if e == nil || !e.Enabled {
			continue
		}
		score := 0
		if e.Category == class.Category {
			score += 10
		}
		for _, t := range e.Tags {
			if wantTags[strings.ToLower(strings.TrimSpace(t))] {
				score += 3
			}
		}
		if score > 0 {
			ranked = append(ranked, scored{entry: e, score: score})
		}
	}

	// Stable selection sort by score (keeps deterministic output).
	out := make([]*model.KnowledgeEntry, 0, maxInjectedEntries)
	used := make(map[string]bool)
	for len(out) < maxInjectedEntries {
		best := -1
		for i := range ranked {
			if used[ranked[i].entry.ID] {
				continue
			}
			if best == -1 || ranked[i].score > ranked[best].score {
				best = i
			}
		}
		if best == -1 {
			break
		}
		used[ranked[best].entry.ID] = true
		out = append(out, ranked[best].entry)
	}
	return out
}

// BuildKnowledgeGuidance renders selected entries into a prompt block injected
// into the main agent's system prompt. Returns "" when there is nothing to add.
func BuildKnowledgeGuidance(category model.AssistantCategory, entries []*model.KnowledgeEntry) string {
	if len(entries) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n## Guidance for this request (detected category: ")
	b.WriteString(string(category))
	b.WriteString(")\nThe intent layer matched these curated knowledge entries. Apply them; do not quote them verbatim.\n")
	for _, e := range entries {
		b.WriteString("\n### ")
		b.WriteString(e.Title)
		if len(e.Tags) > 0 {
			b.WriteString(" [")
			b.WriteString(strings.Join(e.Tags, ", "))
			b.WriteString("]")
		}
		b.WriteString("\n")
		b.WriteString(strings.TrimSpace(e.Body))
		b.WriteString("\n")
	}
	return b.String()
}
