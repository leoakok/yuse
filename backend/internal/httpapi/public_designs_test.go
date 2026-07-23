package httpapi

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestToPublicDesignShareOmitsResumeID(t *testing.T) {
	share := &model.DesignShare{
		ID:          "abc123xyz",
		ResumeID:    "internal-resume-uuid",
		ContentMode: model.DesignShareContentModeDummy,
		IsActive:    true,
		CreatedAt:   "2026-01-01T00:00:00Z",
		UpdatedAt:   "2026-01-01T00:00:00Z",
		URLPath:     "/d/abc123xyz",
	}

	data, err := json.Marshal(toPublicDesignShare(share))
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	body := string(data)
	if strings.Contains(body, "resumeId") {
		t.Fatalf("public design share must not include resumeId, got %s", body)
	}
	if !strings.Contains(body, `"id":"abc123xyz"`) {
		t.Fatalf("expected share id in payload, got %s", body)
	}
}
