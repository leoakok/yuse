package linkedin

import (
	"strings"
	"testing"
)

func TestParseSessionInputBareLIAtRequiresJSessionID(t *testing.T) {
	_, err := parseSessionInput("AQEDAT-example-token")
	if err == nil {
		t.Fatal("expected error when JSESSIONID is missing")
	}
	if !strings.Contains(err.Error(), "missing JSESSIONID") && !strings.Contains(err.Error(), "missing li_at") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestParseSessionInputFullCookieString(t *testing.T) {
	raw := `li_at=AQEDAT-example; JSESSIONID="ajax:1234567890123456789"`
	got, err := parseSessionInput(raw)
	if err != nil {
		t.Fatalf("parseSessionInput: %v", err)
	}
	if got.csrfToken() != "ajax:1234567890123456789" {
		t.Fatalf("csrf token = %q", got.csrfToken())
	}
	if !strings.Contains(got.cookieHeader, `li_at=AQEDAT-example`) {
		t.Fatalf("cookie header = %q", got.cookieHeader)
	}
	if !strings.Contains(got.cookieHeader, `JSESSIONID="ajax:1234567890123456789"`) {
		t.Fatalf("cookie header = %q", got.cookieHeader)
	}
}

func TestParseSessionInputUserFormatWithNewlines(t *testing.T) {
	raw := "li_at=AQEFAHQBAAAAAB2_-\n" +
		"uIAAAGfJQRO7wAAAZ9JENLvTQAAF3VybjpsaTptZW1iZXI6NzIyMjA2NDgzwSpWZl\n" +
		"--ElAD7_ZTfkYeQ2CutA7N8oF_-\n" +
		"iCPFlSxIzewbxeV3JXNa6wzhDWWOpknllM30jPHRto9HhHsSuWYCSpCntGlAgJUUM\n" +
		"UyoUOARyKMui6tyHp-\n" +
		"_SnU8g3TuQA8s9NVl79HOHw98fcsRSqZKLlEeTp5sWMThDCwAj19_4PdTEJDc92US\n" +
		`vkzuACBC0HlZFBNwg; JSESSIONID="ajax:4369099980940807955"`

	wantLIAt := "AQEFAHQBAAAAAB2_-uIAAAGfJQRO7wAAAZ9JENLvTQAAF3VybjpsaTptZW1iZXI6NzIyMjA2NDgzwSpWZl--ElAD7_ZTfkYeQ2CutA7N8oF_-iCPFlSxIzewbxeV3JXNa6wzhDWWOpknllM30jPHRto9HhHsSuWYCSpCntGlAgJUUMUyoUOARyKMui6tyHp-_SnU8g3TuQA8s9NVl79HOHw98fcsRSqZKLlEeTp5sWMThDCwAj19_4PdTEJDc92USvkzuACBC0HlZFBNwg"

	got, err := parseSessionInput(raw)
	if err != nil {
		t.Fatalf("parseSessionInput: %v", err)
	}
	liAt, _, _ := extractSessionValues(got.cookieHeader)
	if liAt != wantLIAt {
		t.Fatalf("li_at = %q", liAt)
	}
	if got.csrfToken() != "ajax:4369099980940807955" {
		t.Fatalf("csrf token = %q", got.csrfToken())
	}
}

func TestParseSessionInputFullNetworkCookieHeader(t *testing.T) {
	raw := `bcookie="v=2&abc"; bscookie="v=1&xyz"; g_state={"i_l":1,"i_p":1782298327833}; li_at=AQEDAT-example; JSESSIONID="ajax:999"; lang=v=2&lang=en-us`
	got, err := parseSessionInput(raw)
	if err != nil {
		t.Fatalf("parseSessionInput: %v", err)
	}
	if got.cookieHeader != raw {
		t.Fatalf("expected full header preserved, got %q", got.cookieHeader)
	}
	if got.csrfToken() != "ajax:999" {
		t.Fatalf("csrf token = %q", got.csrfToken())
	}
}

func TestCsrfTokenStripsQuotes(t *testing.T) {
	if got := csrfTokenFromJSessionID(`"ajax:4369099980940807955"`); got != "ajax:4369099980940807955" {
		t.Fatalf("csrf token = %q", got)
	}
}

func TestBuildJobSearchURLPreservesRestLIQuerySyntax(t *testing.T) {
	got := buildJobSearchURL(SearchParams{Keywords: "software engineer", TimeFilter: "r86400"})
	if strings.Contains(got, "%28origin") {
		t.Fatalf("query param should not encode parens: %s", got)
	}
	if !strings.Contains(got, "keywords:software%20engineer") {
		t.Fatalf("keywords should use %%20 encoding: %s", got)
	}
}

// testBrowserCookie is a real browser Cookie header shape (values may expire).
const testBrowserCookie = `bcookie="v=2&76293ddd-5865-4380-8225-2e9d9416f484"; bscookie="v=1&2026042116583602c893b1-c5f0-4dcf-8669-ab59123bbda2AQFf2XLY9cceKGwdQxru2A3M8KkUb3dY"; JSESSIONID="ajax:4369099980940807955"; timezone=Europe/Istanbul; li_theme=light; li_theme_set=app; dfpfpt=aec2fe61d05448dca0e073d16ae090ce; li_gc=MTswOzE3NzY5NzkyNzA7MjswMjGQW0l6HvsVSosiYgvcCLYrgd5vLQja3r5m4uqJsVzACQ==; lil-lang=en_US; PLAY_LANG=en; li_sugr=301e391b-4afa-4b4f-a6ab-61315cd89ee3; liap=true; li_ep_auth_context=AFlhcHA9YWNjb3VudENlbnRlckh1YixhaWQ9MTIyODkxNjkwLGlpZD0xOTQ1OTk0NDEscGlkPTE0ODQ3OTM5MCxleHA9MTc3ODYwODQ3OTg3NixjdXI9dHJ1ZQEx1GQb_lizvf6cJJBRJUSUAlja5g; bitmovin_analytics_uuid=420ab1ac-f158-4697-bd6e-f7539c281ba6; _pxvid=dbb20645-40a7-11f1-8773-fcfe4324f0bd; g_state={"i_l":1,"i_p":1782298327833}; AnalyticsSyncHistory=AQIu-h62ds67nQAAAZ8JVy8rYC-tirWmPoZenemKj95aFGVVLe_1P-VANN0-3c-vtefzMkoKkM4S9W86A-0lnA; lms_ads=AQG95DB3ZNcbmQAAAZ8TUpKH0yo4IAe8LLBSa9TDwrrcdNREUPDqzqnhSfi5TutsuWCDc-hXAJSumRvE-uikg4O1WNTaUPtp; lms_analytics=AQG95DB3ZNcbmQAAAZ8TUpKH0yo4IAe8LLBSa9TDwrrcdNREUPDqzqnhSfi5TutsuWCDc-hXAJSumRvE-uikg4O1WNTaUPtp; li_at=AQEFAHQBAAAAAB2_-uIAAAGfJQRO7wAAAZ9JENLvTQAAF3VybjpsaTptZW1iZXI6NzIyMjA2NDgzwSpWZl--ElAD7_ZTfkYeQ2CutA7N8oF_-iCPFlSxIzewbxeV3JXNa6wzhDWWOpknllM30jPHRto9HhHsSuWYCSpCntGlAgJUUMUyoUOARyKMui6tyHp-_SnU8g3TuQA8s9NVl79HOHw98fcsRSqZKLlEeTp5sWMThDCwAj19_4PdTEJDc92USvkzuACBC0HlZFBNwg; sdui_ver=sdui-flagship:0.1.44977.1+SduiFlagship0; lang=v=2&lang=en-US; PLAY_SESSION=eyJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7InNlc3Npb25faWQiOiI2ZGNlZmI1Mi0zMmFiLTRjZDYtODdlNS04Y2FjZGZkM2UzYjl8MTc4MzI2MDg3NSIsImFsbG93TGlzdCI6Int9IiwicmVjZW50bHktc2VhcmNoZWQiOiIiLCJyZWZlcnJhbC11cmwiOiJodHRwczovL3d3dy5saW5rZWRpbi5jb20vaGVscC9saW5rZWRpbi9hbnN3ZXIvYTUyMzE0MS8_bGlwaT11cm4lM0FsaSUzQXBhZ2UlM0FkX2ZsYWdzaGlwM19wcm9maWxlX3ZpZXdfYmFzZSUzQk10VkNYQ2hlUm8yaXUxR2tvc04wMmclM0QlM0QiLCJyZWNlbnRseS12aWV3ZWQiOiIiLCJDUFQtaWQiOiLCk3xuw4rDusOCM3TDqF9CXHUwMDBFw6zCjDZaIiwiZmxvd1RyYWNraW5nSWQiOiJhZDB0YVZkWFRLS3RzeEhXUjMwN1B3PT0iLCJleHBlcmllbmNlIjoiIiwidHJrIjoiIn0sIm5iZiI6MTc4MzI2MDg3NSwiaWF0IjoxNzgzMjYwODc1fQ.VEukCMALJ2rQysoqCPCfL_HedNFb_67ZUNhMqNZqrTs; fptctx2=AQFb9txHGPr8Q5P7Wfq9jrLwfPw07HNtbPsg5eeSuGNJB%252fC4aZlk9Tgl258VGHRyJ0pHmSI%252bmzPzZ3ySHF5VO%252fAdRtJp0hF6LOPoN%252f6ZxTi%252b7%252fPmwGryDxo8q2S2YzpccHWGB%252bTCE64wm%252b9mPmB2Q4XUjI4n%252b8g0%252fJdNsgxCKYvsuBWXWEVfoC6eReAT%252bcUHVLKV5EgzFbg7oFbdfrRzn9Tyt2ascmavTiAsCsKVrsg8bAfOtL6kRaUXMPHVpW3FtffVLUZpE%252bQhYH3YRaeaRzHWzW2VQiRA1bZsD0sIh3WxuXEinaATIGhOND%252bPSMh8DQngRbOYhr6ZMFpIGnhNO%252fTm2suhkg79zsuqqzBNbN%252figfr%252fLPqqCzUzLEyddFkYCqc%253d; lidc="b=VB83:s=V:r=V:a=V:p=V:g=4142:u=965:x=1:i=1783363771:t=1783450171:v=2:sig=AQGfRUCPtv_PuOsnGhyPyuvyjSw-xtez"; __cf_bm=sDNXiZlb7qUWBD2RmVqHSWTFl0Y4T.Xak_HWukpvGvY-1783373491.4614847-1.0.1.1-IxN0Zvn_ZhFj2ofGWKK4_kd28C3pAsDZyWs.ny.FHYqZOs_APpTf6NBKbMIuA4IxkVxOrVjjVUoMMH3FOYsuhYUuAvFWiOkJjMHlnkXTw9wFv2NAwcQEOWwK3Cl1YGOJ`

func TestSearchJobsLive(t *testing.T) {
	results, err := SearchJobs(t.Context(), SearchParams{
		Keywords:      "software engineer",
		TimeFilter:    "r86400",
		SessionCookie: testBrowserCookie,
	})
	if err != nil {
		t.Fatalf("SearchJobs: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected job results")
	}
	t.Logf("got %d jobs, first=%q", len(results), results[0].Title)
}
