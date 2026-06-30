package llm

import (
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	twinpkg "github.com/leo/ai-weekend/backend/internal/twin"
)

const twinContextIntro = `Digital Twin (full career knowledge, STAR/PAR structured; use when tailoring CVs; include only relevant items):`

func FormatTwinContext(entries []*model.TwinEntry) string {
	if len(entries) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString(twinContextIntro)
	b.WriteString("\n")
	for _, entry := range entries {
		b.WriteString("- ")
		b.WriteString(twinpkg.FormatEntryLine(entry))
		b.WriteString("\n")
	}
	return b.String()
}
