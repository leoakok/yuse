package store

import (
	"context"
	"testing"
)

func TestVerifyEmailByTokenRejectsEmpty(t *testing.T) {
	err := VerifyEmailByToken(context.Background(), nil, "   ")
	if err != ErrVerificationTokenInvalid {
		t.Fatalf("err = %v, want ErrVerificationTokenInvalid", err)
	}
}
