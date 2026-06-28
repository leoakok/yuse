package store

import (
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/leo/ai-weekend/backend/graph/model"
)

func (m *Memory) ListTrackedJobs() []*model.TrackedJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*model.TrackedJob, 0, len(m.trackedJobs))
	for _, job := range m.trackedJobs {
		if job.WorkspaceID != DemoWorkspaceID {
			continue
		}
		out = append(out, cloneTrackedJob(job))
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt > out[j].UpdatedAt
	})
	return out
}

func (m *Memory) GetTrackedJob(id string) (*model.TrackedJob, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	job, ok := m.trackedJobs[id]
	if !ok || job.WorkspaceID != DemoWorkspaceID {
		return nil, ErrNotFound
	}
	return cloneTrackedJob(job), nil
}

func (m *Memory) CreateTrackedJob(job *model.TrackedJob) *model.TrackedJob {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339)
	if job.ID == "" {
		job.ID = uuid.NewString()
	}
	if job.WorkspaceID == "" {
		job.WorkspaceID = DemoWorkspaceID
	}
	if job.CreatedBy == "" {
		job.CreatedBy = DemoUserID
	}
	if job.CreatedAt == "" {
		job.CreatedAt = now
	}
	job.UpdatedAt = now
	if job.Metadata == nil {
		job.Metadata = map[string]any{}
	}
	if job.Status == "" {
		job.Status = model.JobStatusSaved
	}
	stored := cloneTrackedJob(job)
	m.trackedJobs[stored.ID] = stored
	return cloneTrackedJob(stored)
}

func (m *Memory) UpdateTrackedJob(id string, update func(*model.TrackedJob) error) (*model.TrackedJob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	job, ok := m.trackedJobs[id]
	if !ok || job.WorkspaceID != DemoWorkspaceID {
		return nil, ErrNotFound
	}
	clone := cloneTrackedJob(job)
	if err := update(clone); err != nil {
		return nil, err
	}
	clone.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	m.trackedJobs[id] = clone
	return cloneTrackedJob(clone), nil
}

func (m *Memory) DeleteTrackedJob(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	job, ok := m.trackedJobs[id]
	if !ok || job.WorkspaceID != DemoWorkspaceID {
		return ErrNotFound
	}
	delete(m.trackedJobs, id)
	return nil
}

func cloneTrackedJob(job *model.TrackedJob) *model.TrackedJob {
	if job == nil {
		return nil
	}
	clone := *job
	if job.Metadata != nil {
		meta := make(map[string]any, len(job.Metadata))
		for k, v := range job.Metadata {
			meta[k] = v
		}
		clone.Metadata = meta
	}
	if job.ResumeID != nil {
		id := strings.TrimSpace(*job.ResumeID)
		if id != "" {
			clone.ResumeID = &id
		}
	}
	return &clone
}
