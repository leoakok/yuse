package llm

import (
	"encoding/base64"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestAttachmentRejectsUnsupportedMIME(t *testing.T) {
	content := base64.StdEncoding.EncodeToString([]byte("hello"))
	_, err := attachmentsFromInput([]*model.AssistantAttachmentInput{
		{
			Name:          "notes.txt",
			MimeType:      "text/plain",
			ContentBase64: &content,
		},
	})
	if err == nil {
		t.Fatal("expected unsupported MIME to be rejected")
	}
}

func TestAttachmentRejectsInvalidPDFMagicBytes(t *testing.T) {
	content := base64.StdEncoding.EncodeToString([]byte("not-a-pdf"))
	_, err := attachmentsFromInput([]*model.AssistantAttachmentInput{
		{
			Name:          "resume.pdf",
			MimeType:      "application/pdf",
			ContentBase64: &content,
		},
	})
	if err == nil {
		t.Fatal("expected invalid PDF bytes to be rejected")
	}
}

func TestAttachmentAcceptsValidPDF(t *testing.T) {
	payload := append([]byte("%PDF-1.4\n"), make([]byte, 32)...)
	content := base64.StdEncoding.EncodeToString(payload)
	_, err := attachmentsFromInput([]*model.AssistantAttachmentInput{
		{
			Name:          "resume.pdf",
			MimeType:      "application/pdf",
			ContentBase64: &content,
		},
	})
	if err != nil {
		t.Fatalf("expected valid PDF attachment, got %v", err)
	}
}

func TestAttachmentRejectsLongExtractedText(t *testing.T) {
	longText := stringsRepeat("a", maxExtractedTextChars+1)
	_, err := attachmentsFromInput([]*model.AssistantAttachmentInput{
		{
			Name:          "resume.pdf",
			MimeType:      "application/pdf",
			ExtractedText: &longText,
		},
	})
	if err == nil {
		t.Fatal("expected long extracted text to be rejected")
	}
}

func stringsRepeat(ch string, count int) string {
	out := make([]byte, count)
	for i := range out {
		out[i] = ch[0]
	}
	return string(out)
}
