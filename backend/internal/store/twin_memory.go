package store

import (
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (m *Memory) ListTwinEntries() []*model.TwinEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.TwinEntry, 0, len(m.twinEntries))
	for _, entry := range m.twinEntries {
		out = append(out, cloneTwinEntry(entry))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SortOrder != out[j].SortOrder {
			return out[i].SortOrder < out[j].SortOrder
		}
		return out[i].CreatedAt < out[j].CreatedAt
	})
	return out
}

func (m *Memory) GetTwinEntry(id string) (*model.TwinEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	entry, ok := m.twinEntries[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneTwinEntry(entry), nil
}

func (m *Memory) CreateTwinEntry(entry *model.TwinEntry) *model.TwinEntry {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	if entry.ID == "" {
		entry.ID = uuid.NewString()
	}
	if entry.WorkspaceID == "" {
		entry.WorkspaceID = DemoWorkspaceID
	}
	if entry.CreatedBy == "" {
		entry.CreatedBy = DemoUserID
	}
	if entry.CreatedAt == "" {
		entry.CreatedAt = now
	}
	entry.UpdatedAt = now
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	if entry.SortOrder == 0 {
		entry.SortOrder = m.nextTwinSortOrder()
	}
	stored := cloneTwinEntry(entry)
	m.twinEntries[stored.ID] = stored
	return cloneTwinEntry(stored)
}

func (m *Memory) UpdateTwinEntry(id string, update func(*model.TwinEntry) error) (*model.TwinEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.twinEntries[id]
	if !ok {
		return nil, ErrNotFound
	}
	clone := cloneTwinEntry(entry)
	if err := update(clone); err != nil {
		return nil, err
	}
	clone.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	m.twinEntries[id] = clone
	return cloneTwinEntry(clone), nil
}

func (m *Memory) DeleteTwinEntry(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.twinEntries[id]; !ok {
		return ErrNotFound
	}
	delete(m.twinEntries, id)
	return nil
}

func (m *Memory) nextTwinSortOrder() int {
	max := 0
	for _, entry := range m.twinEntries {
		if entry.SortOrder > max {
			max = entry.SortOrder
		}
	}
	return max + 1
}

func seedTwinEntries(m *Memory, now time.Time) {
	ago := func(d time.Duration) string {
		return now.Add(-d).Format(time.RFC3339)
	}
	m.twinEntries = map[string]*model.TwinEntry{
		"twin-exp-acme": {
			ID:          "twin-exp-acme",
			WorkspaceID: DemoWorkspaceID,
			Type:        model.TwinEntryTypeExperience,
			Title:       "Senior Engineer at Acme Corp",
			Body: strings.TrimSpace(`Led a team of five engineers rebuilding the payments platform from a monolith to event-driven microservices.

Key outcomes:
- Cut checkout latency by 40% and reduced failed transactions by 18%
- Introduced feature flags and canary deploys, shrinking incident blast radius
- Mentored two engineers who were promoted to tech lead roles

Technologies: Go, Kafka, PostgreSQL, Kubernetes, Terraform.`),
			Metadata:  map[string]any{"company": "Acme Corp", "startDate": "2021-03", "endDate": "present"},
			SortOrder: 1,
			CreatedBy: DemoUserID,
			CreatedAt: ago(60 * 24 * time.Hour),
			UpdatedAt: now.Format(time.RFC3339),
		},
	}
}
