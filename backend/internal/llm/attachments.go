package llm

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	openai "github.com/sashabaranov/go-openai"
)

const maxAttachmentBytes = 10 << 20 // 10 MiB

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
		if err := attachment.validateSize(); err != nil {
			return nil, err
		}
		out = append(out, attachment)
	}
	return out, nil
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
			fileLines = append(fileLines, "Content:", attachment.ExtractedText)
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
