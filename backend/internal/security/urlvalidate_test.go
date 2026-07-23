package security

import "testing"

func TestValidateTrackedJobURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "https job board", input: "https://jobs.example.com/role/123"},
		{name: "manual scheme", input: "manual://abc-123"},
		{name: "empty", input: "   ", wantErr: true},
		{name: "file scheme", input: "file:///etc/passwd", wantErr: true},
		{name: "localhost", input: "http://localhost/jobs", wantErr: true},
		{name: "private ip", input: "http://192.168.1.1/jobs", wantErr: true},
		{name: "metadata ip", input: "http://169.254.169.254/latest/meta-data", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ValidateTrackedJobURL(tt.input)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestValidateExternalURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "https avatar", input: "https://avatars.githubusercontent.com/u/1"},
		{name: "empty", input: "   ", wantErr: true},
		{name: "manual scheme", input: "manual://abc", wantErr: true},
		{name: "localhost", input: "http://localhost/photo.jpg", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ValidateExternalURL(tt.input)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
