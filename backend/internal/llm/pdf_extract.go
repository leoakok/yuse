package llm

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

const maxExtractedPDFChars = 8000

func extractPDFTextFromBase64(contentBase64 string) (string, error) {
	encoded := strings.TrimSpace(contentBase64)
	if encoded == "" {
		return "", fmt.Errorf("empty pdf payload")
	}

	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decode pdf base64: %w", err)
	}
	if len(data) == 0 {
		return "", fmt.Errorf("empty pdf bytes")
	}

	reader := bytes.NewReader(data)
	pdfReader, err := pdf.NewReader(reader, int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("open pdf: %w", err)
	}

	plainReader, err := pdfReader.GetPlainText()
	if err != nil {
		return "", fmt.Errorf("extract pdf text: %w", err)
	}

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, plainReader); err != nil {
		return "", fmt.Errorf("read pdf text: %w", err)
	}

	text := strings.TrimSpace(buf.String())
	if text == "" {
		return "", nil
	}
	if len(text) > maxExtractedPDFChars {
		text = text[:maxExtractedPDFChars] + "…"
	}
	return text, nil
}
