package llm

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	openai "github.com/sashabaranov/go-openai"
)

const maxAttachmentBytes = 10 << 20 // 10 MiB
const maxExtractedTextChars = 8000

var allowedAttachmentMIMEs = map[string]struct{}{
	"application/pdf": {},
	"image/jpeg":      {},
	"image/png":       {},
	"image/webp":      {},
}

// Attachment is a file the user attached to an assistant message.
type Attachment struct {
	Name          string
	MimeType      string
	ContentBase64 string
	ExtractedText string
}

func attachmentsFromInput(inputs []*model.AssistantAttachmentInput) ([]Attachment, error) {
	if len(inputs) == 0 {
		return nil, nil
	}
	out := make([]Attachment, 0, len(inputs))
	for _, input := range inputs {
		if input == nil {
			continue
		}
		attachment := Attachment{
			Name:          strings.TrimSpace(input.Name),
			MimeType:      strings.TrimSpace(input.MimeType),
			ContentBase64: strings.TrimSpace(ptrStr(input.ContentBase64)),
			ExtractedText: strings.TrimSpace(ptrStr(input.ExtractedText)),
		}
		if err := attachment.validate(); err != nil {
			return nil, err
		}
		out = append(out, attachment)
	}
	return out, nil
}

func (a Attachment) validate() error {
	if err := a.validateSize(); err != nil {
		return err
	}
	if a.ContentBase64 != "" {
		if err := a.validateMIME(); err != nil {
			return err
		}
		if err := a.validateMagicBytes(); err != nil {
			return err
		}
	}
	if len(a.ExtractedText) > maxExtractedTextChars {
		return fmt.Errorf("attachment %q extracted text exceeds maximum length", a.Name)
	}
	return nil
}

func (a Attachment) validateMIME() error {
	mime := strings.ToLower(strings.TrimSpace(a.MimeType))
	if mime == "" {
		if a.isPDF() {
			mime = "application/pdf"
		} else if a.isImage() {
			mime = "image/jpeg"
		}
	}
	if mime == "" {
		return fmt.Errorf("attachment %q requires a supported file type", a.Name)
	}
	if _, ok := allowedAttachmentMIMEs[mime]; !ok {
		return fmt.Errorf("attachment %q has unsupported type %q", a.Name, mime)
	}
	return nil
}

func (a Attachment) validateMagicBytes() error {
	raw, err := base64.StdEncoding.DecodeString(a.ContentBase64)
	if err != nil {
		return fmt.Errorf("attachment %q has invalid base64 content", a.Name)
	}
	if len(raw) == 0 {
		return fmt.Errorf("attachment %q is empty", a.Name)
	}
	mime := strings.ToLower(strings.TrimSpace(a.MimeType))
	switch {
	case mime == "application/pdf" || a.isPDF():
		if len(raw) < 4 || string(raw[:4]) != "%PDF" {
			return fmt.Errorf("attachment %q is not a valid PDF", a.Name)
		}
	case strings.HasPrefix(mime, "image/") || a.isImage():
		if !looksLikeImageBytes(raw) {
			return fmt.Errorf("attachment %q is not a valid image", a.Name)
		}
	}
	return nil
}

func looksLikeImageBytes(raw []byte) bool {
	if len(raw) >= 3 && raw[0] == 0xFF && raw[1] == 0xD8 && raw[2] == 0xFF {
		return true
	}
	if len(raw) >= 8 && raw[0] == 0x89 && raw[1] == 0x50 && raw[2] == 0x4E && raw[3] == 0x47 {
		return true
	}
	if len(raw) >= 12 && string(raw[0:4]) == "RIFF" && string(raw[8:12]) == "WEBP" {
		return true
	}
	return false
}

func (a Attachment) validateSize() error {
	if a.ContentBase64 == "" {
		return nil
	}
	// Base64 expands payload size; reject obviously oversized encoded strings early.
	if len(a.ContentBase64) > maxAttachmentBytes*2 {
		return fmt.Errorf("attachment %q exceeds maximum size", a.Name)
	}
	decodedLen := base64DecodedLength(a.ContentBase64)
	if decodedLen > maxAttachmentBytes {
		return fmt.Errorf("attachment %q exceeds maximum size", a.Name)
	}
	return nil
}

func base64DecodedLength(encoded string) int {
	padding := 0
	if strings.HasSuffix(encoded, "==") {
		padding = 2
	} else if strings.HasSuffix(encoded, "=") {
		padding = 1
	}
	return (len(encoded)*3)/4 - padding
}

func ptrStr(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (a Attachment) isImage() bool {
	mime := strings.ToLower(a.MimeType)
	if strings.HasPrefix(mime, "image/") {
		return true
	}
	lower := strings.ToLower(a.Name)
	return strings.HasSuffix(lower, ".jpg") ||
		strings.HasSuffix(lower, ".jpeg") ||
		strings.HasSuffix(lower, ".png") ||
		strings.HasSuffix(lower, ".gif") ||
		strings.HasSuffix(lower, ".webp")
}

func (a Attachment) isPDF() bool {
	mime := strings.ToLower(a.MimeType)
	if mime == "application/pdf" {
		return true
	}
	return strings.HasSuffix(strings.ToLower(a.Name), ".pdf")
}

func (a Attachment) hasAnalyzableContent() bool {
	if a.isImage() && a.ContentBase64 != "" {
		return true
	}
	if a.isPDF() && (a.ExtractedText != "" || a.ContentBase64 != "") {
		return true
	}
	return a.ExtractedText != ""
}

func needsVisionModel(attachments []Attachment) bool {
	for _, attachment := range attachments {
		if attachment.isImage() && attachment.ContentBase64 != "" {
			return true
		}
	}
	return false
}

func enrichAttachments(attachments []Attachment) []Attachment {
	if len(attachments) == 0 {
		return attachments
	}
	out := make([]Attachment, len(attachments))
	copy(out, attachments)
	for i := range out {
		if !out[i].isPDF() || out[i].ExtractedText != "" || out[i].ContentBase64 == "" {
			continue
		}
		text, err := extractPDFTextFromBase64(out[i].ContentBase64)
		if err != nil || text == "" {
			continue
		}
		if len(text) > maxExtractedTextChars {
			text = text[:maxExtractedTextChars]
		}
		out[i].ExtractedText = text
	}
	return out
}

func selectModel(useVision bool, miniModel, fallbackModel, visionModel string) (primary, secondary string) {
	if useVision {
		return visionModel, fallbackModel
	}
	return miniModel, fallbackModel
}

func buildUserMessage(
	userText string,
	assistantContext model.AssistantContextInput,
	attachments []Attachment,
) openai.ChatCompletionMessage {
	ctxJSON, _ := json.Marshal(assistantContext)
	prefix := fmt.Sprintf("Context: %s\n\nUser message:\n%s", string(ctxJSON), userText)

	parts := []openai.ChatMessagePart{
		{Type: openai.ChatMessagePartTypeText, Text: prefix},
	}

	for _, attachment := range attachments {
		if attachment.isImage() && attachment.ContentBase64 != "" {
			mime := attachment.MimeType
			if mime == "" {
				mime = "image/jpeg"
			}
			parts = append(parts, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeImageURL,
				ImageURL: &openai.ChatMessageImageURL{
					URL:    fmt.Sprintf("data:%s;base64,%s", mime, attachment.ContentBase64),
					Detail: openai.ImageURLDetailAuto,
				},
			})
			continue
		}

		var fileLines []string
		fileLines = append(fileLines, fmt.Sprintf("Attached file: %s (%s)", attachment.Name, attachment.MimeType))
		if attachment.ExtractedText != "" {
			extracted := attachment.ExtractedText
			if len(extracted) > maxExtractedTextChars {
				extracted = extracted[:maxExtractedTextChars]
			}
			fileLines = append(fileLines, "Content:", extracted)
		} else if attachment.isPDF() {
			fileLines = append(
				fileLines,
				"(PDF attached but text could not be extracted, it may be scanned or image-only.)",
			)
		} else {
			fileLines = append(
				fileLines,
				"(File content could not be extracted, only filename and type are available.)",
			)
		}
		parts = append(parts, openai.ChatMessagePart{
			Type: openai.ChatMessagePartTypeText,
			Text: strings.Join(fileLines, "\n"),
		})
	}

	if len(parts) == 1 {
		return openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleUser,
			Content: prefix,
		}
	}

	return openai.ChatCompletionMessage{
		Role:         openai.ChatMessageRoleUser,
		MultiContent: parts,
	}
}
