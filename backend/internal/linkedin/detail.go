package linkedin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
)

const jobPostingDetailDecoration = "com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65"

func enrichJobDescriptions(ctx context.Context, session sessionCookies, cards []JobCard) []JobCard {
	if len(cards) == 0 {
		return cards
	}

	type result struct {
		index int
		desc  string
		emp   string
	}

	results := make([]result, len(cards))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5)

	for i, card := range cards {
		wg.Add(1)
		go func(index int, jobID string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			desc, emp, err := fetchJobDetail(ctx, session, jobID)
			if err != nil {
				return
			}
			results[index] = result{index: index, desc: desc, emp: emp}
		}(i, card.JobID)
	}
	wg.Wait()

	out := make([]JobCard, len(cards))
	copy(out, cards)
	for _, r := range results {
		if r.desc != "" {
			out[r.index].Description = r.desc
		}
		if r.emp != "" && out[r.index].EmploymentType == "" {
			out[r.index].EmploymentType = r.emp
		}
	}
	return out
}

func fetchJobDetail(ctx context.Context, session sessionCookies, jobID string) (description, employmentType string, err error) {
	reqURL := fmt.Sprintf("https://www.linkedin.com/voyager/api/jobs/jobPostings/%s?decorationId=%s", jobID, jobPostingDetailDecoration)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", "", err
	}
	applyVoyagerHeaders(req, session)
	req.Header.Set("Referer", fmt.Sprintf("https://www.linkedin.com/jobs/view/%s", jobID))

	resp, err := voyagerHTTPClient().Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return "", "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", "", fmt.Errorf("job detail HTTP %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", "", err
	}
	data, _ := payload["data"].(map[string]any)
	if data == nil {
		return "", "", nil
	}

	description = textFromViewModel(data["description"])
	employmentType = firstString(data, "formattedEmploymentStatus")
	if employmentType == "" {
		employmentType = textFromViewModel(data["employmentStatus"])
	}
	return description, employmentType, nil
}
