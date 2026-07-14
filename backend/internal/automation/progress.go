package automation

// ProgressSink receives live step updates during an automation run.
type ProgressSink interface {
	Step(id, label, status string, detail map[string]any)
}

// NopProgressSink ignores progress events.
type NopProgressSink struct{}

func (NopProgressSink) Step(string, string, string, map[string]any) {}

func emit(sink ProgressSink, id, label, status string, detail map[string]any) {
	if sink == nil {
		return
	}
	sink.Step(id, label, status, detail)
}
