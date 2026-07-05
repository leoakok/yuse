package store

import (
	"testing"
)

func TestRoleForEmailDefaultAdmin(t *testing.T) {
	t.Setenv("ADMIN_EMAILS", "")
	if RoleForEmail("leo@yuse.one") != "ADMIN" {
		t.Fatal("leo@yuse.one should always be admin")
	}
	if RoleForEmail("other@example.com") != "USER" {
		t.Fatal("unexpected admin for other email")
	}
}

func TestRoleForEmailFromEnv(t *testing.T) {
	t.Setenv("ADMIN_EMAILS", "ops@yuse.one")
	if RoleForEmail("ops@yuse.one") != "ADMIN" {
		t.Fatal("expected ops admin from env")
	}
	if RoleForEmail("leo@yuse.one") != "ADMIN" {
		t.Fatal("leo@yuse.one should remain admin when ADMIN_EMAILS is set")
	}
}
