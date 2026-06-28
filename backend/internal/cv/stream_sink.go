package cv

import (
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

type resumePatchSink struct {
	inner llm.StreamSink
	cv    *Service
}

func wrapResumePatchSink(cv *Service, inner llm.StreamSink) llm.StreamSink {
	if inner == nil {
		return nil
	}
	return &resumePatchSink{inner: inner, cv: cv}
}

func (s *resumePatchSink) Status(label string) { s.inner.Status(label) }

func (s *resumePatchSink) ToolStart(name string, args map[string]any) {
	s.inner.ToolStart(name, args)
}

func (s *resumePatchSink) ToolEnd(exec mcp.Execution) {
	s.inner.ToolEnd(exec)
	if exec.Error != "" || len(exec.AffectedResumeIDs) == 0 {
		return
	}
	for _, resumeID := range exec.AffectedResumeIDs {
		content := resumeContentFromExecution(exec, resumeID)
		if content == nil {
			var err error
			content, err = s.cv.store.ResumeWithContent(resumeID)
			if err != nil {
				continue
			}
		}
		s.inner.ResumePatch(content)
	}
}

func (s *resumePatchSink) Delta(text string) { s.inner.Delta(text) }

func (s *resumePatchSink) ResumePatch(content *model.ResumeWithContent) {
	s.inner.ResumePatch(content)
}

func resumeContentFromExecution(exec mcp.Execution, resumeID string) *model.ResumeWithContent {
	content, ok := exec.Result.(*model.ResumeWithContent)
	if !ok || content == nil || content.Resume == nil || content.Resume.ID != resumeID {
		return nil
	}
	return content
}
