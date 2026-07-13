package linkedin

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
)

func TestLiveJobSearchPagination(t *testing.T) {
	cookie := os.Getenv("LI_COOKIE")
	if cookie == "" {
		t.Skip("set LI_COOKIE to run")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	for _, max := range []int{100, 200, 300} {
		t.Run(fmt.Sprintf("max_%d", max), func(t *testing.T) {
			got, err := SearchJobs(ctx, SearchParams{
				GeoID:         "102424322",
				TimeFilter:    "r86400",
				SessionCookie: cookie,
				MaxResults:    max,
			})
			if err != nil {
				t.Fatal(err)
			}
			t.Logf("max=%d fetched=%d", max, len(got))
		})
	}
}

func TestLiveJobSearchPages(t *testing.T) {
	cookie := os.Getenv("LI_COOKIE")
	if cookie == "" {
		t.Skip("set LI_COOKIE to run")
	}
	session, err := parseSessionInput(cookie)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	params := SearchParams{
		GeoID:      "102424322",
		TimeFilter: "r86400",
	}
	for _, start := range []int{0, 100, 175, 200, 225, 250, 275} {
		params.Start = start
		cards, err := searchJobsPage(ctx, session, params)
		if err != nil {
			t.Fatalf("start=%d: %v", start, err)
		}
		t.Logf("start=%d pageCards=%d", start, len(cards))
	}
}
