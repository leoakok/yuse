package store

import (
	"context"
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestSectionCustomKeyDerivation(t *testing.T) {
	t.Parallel()
	cases := map[string]string{
		"Patents":              "patents",
		"Speaking Engagements": "speaking-engagements",
		"  Awards & Honors  ":  "awards-honors",
	}
	for title, want := range cases {
		if got := sectionCustomKey(title); got != want {
			t.Fatalf("sectionCustomKey(%q) = %q, want %q", title, got, want)
		}
	}
}

func TestClaimInviteLinkApprovesSignup(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	t.Setenv("BETA_INVITE_ONLY", "true")
	email := "invite-claim-" + t.Name() + "@example.com"

	status, err := SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus before claim: %v", err)
	}
	if status != AccessDenied {
		t.Fatalf("expected denied before claim, got %s", status)
	}

	var actorID string
	if err := pool.QueryRow(ctx, `SELECT id FROM users ORDER BY created_at LIMIT 1`).Scan(&actorID); err != nil {
		t.Fatalf("load actor: %v", err)
	}

	maxUses := 3
	link, err := CreateInviteLink(ctx, pool, actorID, model.CreateInviteLinkInput{
		Label:   strPtr("Test invite"),
		MaxUses: &maxUses,
	})
	if err != nil {
		t.Fatalf("CreateInviteLink: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM beta_invite_redemptions WHERE invite_id = $1`, link.ID)
		_, _ = pool.Exec(ctx, `DELETE FROM beta_invite_links WHERE id = $1`, link.ID)
		_, _ = pool.Exec(ctx, `DELETE FROM beta_waitlist WHERE LOWER(email) = LOWER($1)`, email)
	})

	if err := ClaimInviteLink(ctx, pool, link.Code, email); err != nil {
		t.Fatalf("ClaimInviteLink: %v", err)
	}

	status, err = SignupAccessStatus(ctx, pool, email)
	if err != nil {
		t.Fatalf("SignupAccessStatus after claim: %v", err)
	}
	if status != AccessApproved {
		t.Fatalf("expected approved after claim, got %s", status)
	}
}
