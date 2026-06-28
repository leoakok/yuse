package twin

import (
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestMissingElementsSTAR(t *testing.T) {
	entry := &model.TwinEntry{
		Type: model.TwinEntryTypeExperience,
		Metadata: map[string]any{
			"situation": "Startup payments team",
			"action":    "Rewrote checkout in Go",
		},
	}
	missing := MissingElements(entry)
	if len(missing) != 2 {
		t.Fatalf("expected 2 missing (task, result), got %v", missing)
	}
}

func TestMissingElementsPARComplete(t *testing.T) {
	entry := &model.TwinEntry{
		Type: model.TwinEntryTypeProject,
		Metadata: map[string]any{
			"storyFormat": "PAR",
			"problem":     "Slow checkout",
			"action":      "Rewrote in Go",
			"result":      "40% faster",
		},
	}
	if !IsComplete(entry) {
		t.Fatalf("expected complete PAR entry, missing: %v", MissingElements(entry))
	}
}

func TestFormatEntryLineShowsGaps(t *testing.T) {
	entry := &model.TwinEntry{
		Type:  model.TwinEntryTypeExperience,
		Title: "Payments rewrite",
		Metadata: map[string]any{
			"company": "Acme",
			"action":  "Led migration",
		},
	}
	line := FormatEntryLine(entry)
	if line == "" {
		t.Fatal("expected non-empty line")
	}
	for _, want := range []string{"Acme", "missing:", "result"} {
		if !strings.Contains(line, want) {
			t.Fatalf("expected %q in %q", want, line)
		}
	}
}
