package llm

import "testing"

func TestExtractPDFTextFromBase64_invalidInput(t *testing.T) {
	t.Parallel()

	_, err := extractPDFTextFromBase64("not-valid-base64!!!")
	if err == nil {
		t.Fatal("expected error for invalid base64")
	}

	_, err = extractPDFTextFromBase64("")
	if err == nil {
		t.Fatal("expected error for empty payload")
	}
}
