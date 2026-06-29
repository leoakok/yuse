package cv

import (
	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

type documentPatchSink struct {
	inner llm.StreamSink
	cv    *Service
}

func wrapResumePatchSink(cv *Service, inner llm.StreamSink) llm.StreamSink {
	if inner == nil {
		return nil
	}
	return &documentPatchSink{inner: inner, cv: cv}
}

func (s *documentPatchSink) Status(label string) { s.inner.Status(label) }

func (s *documentPatchSink) ToolStart(name string, args map[string]any) {
	s.inner.ToolStart(name, args)
}

func (s *documentPatchSink) ToolEnd(exec mcp.Execution) {
	s.inner.ToolEnd(exec)
	if exec.Error != "" {
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
	for _, portfolioID := range exec.AffectedPortfolioIDs {
		content := portfolioContentFromExecution(exec, portfolioID)
		if content == nil {
			var err error
			content, err = s.cv.store.PortfolioWithContent(portfolioID)
			if err != nil {
				continue
			}
		}
		s.inner.PortfolioPatch(content)
	}
}

func (s *documentPatchSink) Delta(text string) { s.inner.Delta(text) }

func (s *documentPatchSink) ResumePatch(content *model.ResumeWithContent) {
	s.inner.ResumePatch(content)
}

func (s *documentPatchSink) PortfolioPatch(content *model.PortfolioWithContent) {
	s.inner.PortfolioPatch(content)
}

func resumeContentFromExecution(exec mcp.Execution, resumeID string) *model.ResumeWithContent {
	content, ok := exec.Result.(*model.ResumeWithContent)
	if !ok || content == nil || content.Resume == nil || content.Resume.ID != resumeID {
		return nil
	}
	return content
}

func portfolioContentFromExecution(exec mcp.Execution, portfolioID string) *model.PortfolioWithContent {
	content, ok := exec.Result.(*model.PortfolioWithContent)
	if !ok || content == nil || content.Portfolio == nil || content.Portfolio.ID != portfolioID {
		return nil
	}
	return content
}
