package llm

import (
	"encoding/json"
	"testing"
)

func TestBuildChatCompletionRequestOmitsTemperatureForGPT5(t *testing.T) {
	req := buildChatCompletionRequest("gpt-5.4-mini", nil, nil)
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatal(err)
	}
	if _, ok := payload["temperature"]; ok {
		t.Fatalf("expected temperature omitted for gpt-5.4-mini, got %v", payload["temperature"])
	}
}

func TestBuildChatCompletionRequestSetsTemperatureForGPT4(t *testing.T) {
	req := buildChatCompletionRequest("gpt-4o", nil, nil)
	if req.Temperature != 0.2 {
		t.Fatalf("expected temperature 0.2, got %v", req.Temperature)
	}
}

func TestModelHasFixedSamplingParams(t *testing.T) {
	fixed := []string{"gpt-5.4-mini", "gpt-5-mini", "o1-preview", "o3-mini", "o4-mini"}
	for _, model := range fixed {
		if !modelHasFixedSamplingParams(model) {
			t.Fatalf("expected %q to have fixed sampling params", model)
		}
	}
	if modelHasFixedSamplingParams("gpt-4o") {
		t.Fatal("expected gpt-4o to allow custom sampling params")
	}
}
