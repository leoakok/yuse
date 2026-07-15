package store

import "testing"

func TestAdminUserSearchPattern(t *testing.T) {
	if got := adminUserSearchPattern("  "); got != "" {
		t.Fatalf("blank: %q", got)
	}
	if got := adminUserSearchPattern("leo"); got != "%leo%" {
		t.Fatalf("simple: %q", got)
	}
	if got := adminUserSearchPattern("100%_off"); got != `%100\%\_off%` {
		t.Fatalf("escaped: %q", got)
	}
}
