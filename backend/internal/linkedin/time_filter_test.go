package linkedin

import "testing"

func TestNormalizeTimeFilter(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", "r86400"},
		{"r86400", "r86400"},
		{"86400", "r86400"},
		{"900", "r900"},
		{"15m", "r900"},
		{"1h", "r3600"},
		{"2h", "r7200"},
		{"7d", "r604800"},
	}
	for _, tc := range tests {
		got, err := NormalizeTimeFilter(tc.in)
		if err != nil {
			t.Fatalf("%q: %v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("%q: got %q want %q", tc.in, got, tc.want)
		}
	}
}

func TestNormalizeTimeFilterInvalid(t *testing.T) {
	for _, in := range []string{"0", "-1", "abc", "30x"} {
		if _, err := NormalizeTimeFilter(in); err == nil {
			t.Fatalf("expected error for %q", in)
		}
	}
}
