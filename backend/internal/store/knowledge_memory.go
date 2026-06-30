package store

import (
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (m *Memory) ListKnowledgeEntries(includeDisabled bool) []*model.KnowledgeEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.KnowledgeEntry, 0, len(m.knowledgeEntries))
	for _, entry := range m.knowledgeEntries {
		if !includeDisabled && !entry.Enabled {
			continue
		}
		out = append(out, cloneKnowledgeEntry(entry))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Category != out[j].Category {
			return out[i].Category < out[j].Category
		}
		return out[i].Title < out[j].Title
	})
	return out
}

func (m *Memory) GetKnowledgeEntry(id string) (*model.KnowledgeEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	entry, ok := m.knowledgeEntries[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneKnowledgeEntry(entry), nil
}

func (m *Memory) CreateKnowledgeEntry(entry *model.KnowledgeEntry) (*model.KnowledgeEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	if entry.ID == "" {
		entry.ID = "kb-" + uuid.NewString()[:8]
	}
	if entry.Tags == nil {
		entry.Tags = []string{}
	}
	entry.CreatedAt = now
	entry.UpdatedAt = now
	stored := cloneKnowledgeEntry(entry)
	m.knowledgeEntries[stored.ID] = stored
	return cloneKnowledgeEntry(stored), nil
}

func (m *Memory) UpdateKnowledgeEntry(id string, update func(*model.KnowledgeEntry) error) (*model.KnowledgeEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.knowledgeEntries[id]
	if !ok {
		return nil, ErrNotFound
	}
	clone := cloneKnowledgeEntry(entry)
	if err := update(clone); err != nil {
		return nil, err
	}
	if clone.Tags == nil {
		clone.Tags = []string{}
	}
	clone.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	m.knowledgeEntries[id] = clone
	return cloneKnowledgeEntry(clone), nil
}

func (m *Memory) DeleteKnowledgeEntry(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.knowledgeEntries[id]; !ok {
		return ErrNotFound
	}
	delete(m.knowledgeEntries, id)
	return nil
}

func cloneKnowledgeEntry(entry *model.KnowledgeEntry) *model.KnowledgeEntry {
	if entry == nil {
		return nil
	}
	c := *entry
	c.Tags = append([]string(nil), entry.Tags...)
	return &c
}

func seedKnowledgeEntries(m *Memory, now time.Time) {
	ts := now.Format(time.RFC3339)
	entries := []*model.KnowledgeEntry{
		{
			ID:       "kb-cv-best-practices",
			Slug:     "cv-best-practices",
			Title:    "CV best practices",
			Category: model.AssistantCategoryCreateCv,
			Tags:     []string{"cv-best-practices", "resume", "create-cv", "update-cv"},
			Body:     "Lead with impact, tailor to the role, keep it scannable, stay honest, and keep length tight.",
			Enabled:  true,
		},
		{
			ID:       "kb-star-par",
			Slug:     "star-par",
			Title:    "STAR and PAR for achievements",
			Category: model.AssistantCategoryUpdateCv,
			Tags:     []string{"star", "par", "achievements", "experience", "digital-twin"},
			Body:     "STAR (Situation, Task, Action, Result) for jobs; PAR (Problem, Action, Result) for projects. Quantify the result.",
			Enabled:  true,
		},
		{
			ID:       "kb-cover-letter",
			Slug:     "cover-letter",
			Title:    "Cover letter structure",
			Category: model.AssistantCategoryJobApplication,
			Tags:     []string{"cover-letter", "job-application"},
			Body:     "Hook, proof with two or three mapped achievements, fit and close. Under 300 words, no invented facts.",
			Enabled:  true,
		},
		{
			ID:       "kb-job-application-playbook",
			Slug:     "job-application-playbook",
			Title:    "Job application playbook",
			Category: model.AssistantCategoryJobApplication,
			Tags:     []string{"job-application", "tailoring", "skill-gap"},
			Body:     "Research the role, compare to Twin/CV, ask before claiming missing skills, tailor, write a cover letter, save the application.",
			Enabled:  true,
		},
		{
			ID:       "kb-ats-tips",
			Slug:     "ats-tips",
			Title:    "ATS-friendly formatting",
			Category: model.AssistantCategoryCreateCv,
			Tags:     []string{"ats", "formatting", "cv-best-practices"},
			Body:     "Use standard headings, real text, posting keywords, simple layout, and PDF export.",
			Enabled:  true,
		},
		{
			ID:       "kb-career-advice",
			Slug:     "career-advice",
			Title:    "General CV and career advice",
			Category: model.AssistantCategoryAdvice,
			Tags:     []string{"advice", "career", "cv-best-practices"},
			Body:     "Be concrete and HR-grounded, anchor to the user's situation, keep it short, and offer to act.",
			Enabled:  true,
		},
		{
			ID:       "kb-portfolio",
			Slug:     "portfolio-best-practices",
			Title:    "Portfolio best practices",
			Category: model.AssistantCategoryPortfolio,
			Tags:     []string{"portfolio", "case-study", "projects"},
			Body:     "A narrative showcase: clear hero, case studies as Problem/Approach/Outcome, links and impact per project.",
			Enabled:  true,
		},
		{
			ID:       "kb-out-of-scope",
			Slug:     "out-of-scope",
			Title:    "Staying in scope",
			Category: model.AssistantCategoryOutOfScope,
			Tags:     []string{"scope", "guardrail"},
			Body:     "Only CVs, portfolios, job applications, and career advice. Decline other requests warmly and redirect.",
			Enabled:  true,
		},
	}
	for _, e := range entries {
		e.CreatedAt = ts
		e.UpdatedAt = ts
		m.knowledgeEntries[e.ID] = e
	}
}
