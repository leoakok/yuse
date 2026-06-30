package slug

import "testing"

func TestNormalize(t *testing.T) {
	tests := map[string]string{
		"  My Portfolio  ": "my-portfolio",
		"Leo":              "leo",
		"hello__world":     "hello-world",
	}
	for input, want := range tests {
		if got := Normalize(input); got != want {
			t.Fatalf("Normalize(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestValidateReserved(t *testing.T) {
	if _, err := Validate("admin"); err == nil {
		t.Fatal("expected admin to be reserved")
	}
	if _, err := Validate("settings"); err == nil {
		t.Fatal("expected settings to be reserved")
	}
}

func TestValidateFormat(t *testing.T) {
	if _, err := Validate("ab"); err == nil {
		t.Fatal("expected too short slug to fail")
	}
	if _, err := Validate("---"); err == nil {
		t.Fatal("expected invalid slug to fail")
	}
	got, err := Validate("leo-dev")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "leo-dev" {
		t.Fatalf("got %q", got)
	}
}
