package linkedin

import (
	"os"
	"testing"
)

func TestLiveListAppliedJobs(t *testing.T) {
	cookie := os.Getenv("LI_COOKIE")
	if cookie == "" {
		t.Skip("set LI_COOKIE to run")
	}
	cards, err := ListAppliedJobs(t.Context(), cookie)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("applications=%d", len(cards))
}
