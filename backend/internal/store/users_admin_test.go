package store

import (
	"testing"
)

func TestRoleForEmailEmptyEnv(t *testing.T) {
	t.Setenv("ADMIN_EMAILS", "")
	configuredAdminEmails = nil
	if RoleForEmail("ops@example.com") != "USER" {
		t.Fatal("expected no env admins when ADMIN_EMAILS is empty")
	}
	if RoleForEmail("other@example.com") != "USER" {
		t.Fatal("unexpected admin for other email")
	}
}

func TestRoleForEmailFromEnv(t *testing.T) {
	t.Setenv("ADMIN_EMAILS", "ops@example.com, Admin@Example.Com")
	configuredAdminEmails = nil
	if RoleForEmail("ops@example.com") != "ADMIN" {
		t.Fatal("expected ops admin from env")
	}
	if RoleForEmail("admin@example.com") != "ADMIN" {
		t.Fatal("expected normalized admin email from env")
	}
	if RoleForEmail("other@example.com") != "USER" {
		t.Fatal("unexpected admin for non-listed email")
	}
}

func TestRoleForEmailFromConfig(t *testing.T) {
	ConfigureAdminEmails([]string{"config@example.com"})
	t.Cleanup(func() { configuredAdminEmails = nil })
	if RoleForEmail("config@example.com") != "ADMIN" {
		t.Fatal("expected admin from ConfigureAdminEmails")
	}
	if RoleForEmail("other@example.com") != "USER" {
		t.Fatal("unexpected admin for non-config email")
	}
}
