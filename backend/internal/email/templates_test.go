package email

import (
	"strings"
	"testing"
)

func TestRenderWelcomeEmail(t *testing.T) {
	body, err := welcomeBody("Leo", "https://yuse.one")
	if err != nil {
		t.Fatal(err)
	}
	html, err := renderEmail("Welcome", "preheader", body)
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{"Welcome to Yuse", "Leo", "https://yuse.one"} {
		if !strings.Contains(html, part) {
			t.Fatalf("missing %q in html", part)
		}
	}
}
