package cv

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/llm"
	"github.com/leo/ai-weekend/backend/internal/store"
)

// ErrForbidden is returned when a non-admin attempts an admin-only operation.
var ErrForbidden = errors.New("forbidden: admin role required")

// IsAdmin reports whether the signed-in user has the ADMIN role.
func (s *Service) IsAdmin() bool {
	u := s.store.User()
	return u != nil && u.Role == model.UserRoleAdmin
}

func (s *Service) requireAdmin() error {
	if !s.IsAdmin() {
		return ErrForbidden
	}
	return nil
}

// ListKnowledgeEntries returns dictionary entries (admin only).
func (s *Service) ListKnowledgeEntries(includeDisabled bool) ([]*model.KnowledgeEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.ListKnowledgeEntries(includeDisabled), nil
}

// CreateKnowledgeEntry adds a dictionary entry (admin only).
func (s *Service) CreateKnowledgeEntry(input model.CreateKnowledgeEntryInput) (*model.KnowledgeEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	slug := strings.TrimSpace(input.Slug)
	title := strings.TrimSpace(input.Title)
	body := strings.TrimSpace(input.Body)
	if slug == "" || title == "" || body == "" {
		return nil, fmt.Errorf("slug, title, and body are required")
	}
	if !input.Category.IsValid() {
		return nil, fmt.Errorf("invalid category")
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	return s.store.CreateKnowledgeEntry(&model.KnowledgeEntry{
		Slug:     slug,
		Title:    title,
		Category: input.Category,
		Tags:     normalizeTags(input.Tags),
		Body:     body,
		Enabled:  enabled,
	})
}

// UpdateKnowledgeEntry edits a dictionary entry (admin only).
func (s *Service) UpdateKnowledgeEntry(input model.UpdateKnowledgeEntryInput) (*model.KnowledgeEntry, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	return s.store.UpdateKnowledgeEntry(input.ID, func(entry *model.KnowledgeEntry) error {
		if input.Slug != nil {
			slug := strings.TrimSpace(*input.Slug)
			if slug == "" {
				return fmt.Errorf("slug cannot be empty")
			}
			entry.Slug = slug
		}
		if input.Title != nil {
			title := strings.TrimSpace(*input.Title)
			if title == "" {
				return fmt.Errorf("title cannot be empty")
			}
			entry.Title = title
		}
		if input.Category != nil {
			if !input.Category.IsValid() {
				return fmt.Errorf("invalid category")
			}
			entry.Category = *input.Category
		}
		if input.Tags != nil {
			entry.Tags = normalizeTags(input.Tags)
		}
		if input.Body != nil {
			body := strings.TrimSpace(*input.Body)
			if body == "" {
				return fmt.Errorf("body cannot be empty")
			}
			entry.Body = body
		}
		if input.Enabled != nil {
			entry.Enabled = *input.Enabled
		}
		return nil
	})
}

// DeleteKnowledgeEntry removes a dictionary entry (admin only).
func (s *Service) DeleteKnowledgeEntry(id string) (bool, error) {
	if err := s.requireAdmin(); err != nil {
		return false, err
	}
	if err := s.store.DeleteKnowledgeEntry(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// ClassifyAssistantMessage runs the cheap intent layer for a test message and
// returns the full breakdown (admin only, powers the experiment page).
func (s *Service) ClassifyAssistantMessage(
	ctx context.Context,
	text string,
	assistantContext model.AssistantContextInput,
) (*model.AssistantClassification, error) {
	if err := s.requireAdmin(); err != nil {
		return nil, err
	}
	class := s.llm.Classify(ctx, text, assistantContext, nil)

	selected := llm.SelectKnowledge(s.store.ListKnowledgeEntries(false), class)
	guidance := llm.BuildKnowledgeGuidance(class.Category, selected)

	result := &model.AssistantClassification{
		Category:        class.Category,
		Confidence:      class.Confidence,
		Tags:            class.Tags,
		Reason:          class.Reason,
		Source:          class.Source,
		ScopeHandled:    llm.IsScopeHandled(class.Category),
		SelectedEntries: selected,
		Guidance:        guidance,
	}
	if result.Tags == nil {
		result.Tags = []string{}
	}
	if result.SelectedEntries == nil {
		result.SelectedEntries = []*model.KnowledgeEntry{}
	}
	if reply := llm.ScopeReply(class, text); reply != "" {
		result.CannedReply = &reply
	}
	return result, nil
}

func normalizeTags(tags []string) []string {
	out := make([]string, 0, len(tags))
	seen := make(map[string]bool)
	for _, t := range tags {
		t = strings.ToLower(strings.TrimSpace(t))
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		out = append(out, t)
	}
	return out
}
