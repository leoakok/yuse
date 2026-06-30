package llm

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/leo/ai-weekend/backend/graph/model"
	"github.com/leo/ai-weekend/backend/internal/mcp"
)

var (
	testEmailPattern          = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	testExperienceAtPattern   = regexp.MustCompile(`(?i)(?:senior\s+)?([a-z][\w\s]*?)\s+(?:role\s+)?at\s+([A-Za-z][\w\s&.-]+)`)
	testProfileNamePattern    = regexp.MustCompile(`(?i)(?:profile\s+)?name\s+to\s+(.+?)(?:\.|$)`)
	testNamedResumePattern    = regexp.MustCompile(`(?i)(?:update|edit|change|on)\s+(?:the\s+)?(.+?)(?:'s|s)?\s+(?:resume|cv)`)
	testLivesInPattern        = regexp.MustCompile(`(?i)lives?\s+in\s+([^,.\n]+)`)
)

// runRuleAgent exercises MCP tools with deterministic rules for unit tests only.
func (s *Service) runRuleAgent(
	userText string,
	assistantContext model.AssistantContextInput,
	attachments []Attachment,
	twinContext string,
	tools *mcp.Registry,
) (string, []mcp.Execution, error) {
	if len(attachments) > 0 {
		return "", nil, fmt.Errorf("attachments require OpenAI API key")
	}

	lower := strings.ToLower(userText)
	var executions []mcp.Execution
	resumeID := testResolveResumeID(tools, assistantContext, userText)

	if strings.Contains(lower, "create") && strings.Contains(lower, "resume") {
		title := testExtractTitleFromCreateResume(userText)
		exec := tools.Execute("create_resume", testMustJSON(map[string]string{"title": title}))
		executions = append(executions, exec)
		return fmt.Sprintf("Created a new resume draft: %q.", title), executions, nil
	}

	if testIsTwinIntent(lower) {
		title, body := testTwinEntryFromText(userText)
		exec := tools.Execute("create_twin_entry", testMustJSON(map[string]any{
			"type":  "EXPERIENCE",
			"title": title,
			"body":  body,
		}))
		executions = append(executions, exec)
		if exec.Error == "" {
			return "I've added that to your Digital Twin.", executions, nil
		}
	}

	if resumeID != "" && testIsHideIntent(lower) {
		keyword := testHideKeyword(lower)
		reply, execs, ok := s.testHideItem(tools, resumeID, keyword)
		if ok {
			return reply, append(executions, execs...), nil
		}
	}

	if resumeID != "" {
		if email := testExtractEmail(userText); email != "" && (strings.Contains(lower, "email") || strings.Contains(lower, "contact")) {
			exec := tools.Execute("update_contact_profile", testMustJSON(map[string]any{
				"resumeId": resumeID,
				"email":    email,
			}))
			executions = append(executions, exec)
			if exec.Error == "" {
				return fmt.Sprintf("Updated your email to %s.", email), executions, nil
			}
		}
		if loc := testExtractLocation(userText); loc != "" && (strings.Contains(lower, "location") || strings.Contains(lower, "lives in") || strings.Contains(lower, "live in")) {
			exec := tools.Execute("update_contact_profile", testMustJSON(map[string]any{
				"resumeId": resumeID,
				"location": loc,
			}))
			executions = append(executions, exec)
			if exec.Error == "" {
				return fmt.Sprintf("Updated location to %s.", loc), executions, nil
			}
		}
		if name := testExtractProfileName(userText); name != "" && (strings.Contains(lower, "profile") || strings.Contains(lower, "name")) {
			exec := tools.Execute("update_contact_profile", testMustJSON(map[string]any{
				"resumeId": resumeID,
				"fullName": name,
			}))
			executions = append(executions, exec)
			if exec.Error == "" {
				return fmt.Sprintf("Updated your profile name to %s.", name), executions, nil
			}
		}
	}

	if resumeID != "" && (strings.Contains(lower, "add") || strings.Contains(lower, "experience")) {
		reply, execs, ok := s.testAddExperience(tools, resumeID, userText)
		if ok {
			return reply, append(executions, execs...), nil
		}
	}

	if resumeID != "" && strings.Contains(lower, "skill") {
		content := tools.Execute("get_resume_content", testMustJSON(map[string]string{"id": resumeID}))
		executions = append(executions, content)
		item := testFindSectionItem(content, "SKILLS")
		if item != nil {
			addExec := tools.Execute("add_section_item", testMustJSON(map[string]any{
				"resumeId":  resumeID,
				"sectionId": item["sectionId"],
				"headline":  "Kubernetes",
				"level":     "INTERMEDIATE",
			}))
			executions = append(executions, addExec)
			return "I've added Kubernetes to your skills.", executions, nil
		}
	}

	if resumeID != "" && strings.Contains(lower, "summary") {
		content := tools.Execute("get_resume_content", testMustJSON(map[string]string{"id": resumeID}))
		executions = append(executions, content)
		item := testFindSectionItem(content, "SUMMARY")
		if item != nil {
			updateExec := tools.Execute("update_section_item", testMustJSON(map[string]any{
				"resumeId":      resumeID,
				"sectionId":     item["sectionId"],
				"sectionItemId": item["sectionItemId"],
				"body":          "Full-stack engineer with 8+ years building developer tools and AI-native products.",
			}))
			executions = append(executions, updateExec)
			return "I've refined your professional summary.", executions, nil
		}
	}

	_ = twinContext
	return "I can help you build and tailor your CV.", executions, nil
}

func testMustJSON(v any) []byte {
	raw, _ := json.Marshal(v)
	return raw
}

func testExtractTitleFromCreateResume(userText string) string {
	lower := strings.ToLower(userText)
	title := strings.TrimSpace(strings.ReplaceAll(lower, "create", ""))
	title = strings.TrimSpace(strings.ReplaceAll(title, "resume", ""))
	title = strings.TrimSpace(strings.ReplaceAll(title, "a", ""))
	title = strings.TrimSpace(strings.ReplaceAll(title, "new", ""))
	if title == "" {
		return "New Resume"
	}
	return title
}

func testFirstSectionID(exec mcp.Execution) string {
	if exec.Error != "" || exec.Result == nil {
		return ""
	}
	sections, ok := exec.Result.([]*model.Section)
	if !ok || len(sections) == 0 {
		return ""
	}
	return sections[0].ID
}

func testFindSectionItem(contentExec mcp.Execution, sectionType string) map[string]any {
	if contentExec.Error != "" || contentExec.Result == nil {
		return nil
	}
	if content, ok := contentExec.Result.(*model.ResumeWithContent); ok {
		for _, swi := range content.Sections {
			if swi.Section.Type != model.SectionType(sectionType) {
				continue
			}
			if len(swi.Items) == 0 {
				continue
			}
			return map[string]any{
				"sectionId":     swi.Section.ID,
				"sectionItemId": swi.Items[0].ID,
			}
		}
		return nil
	}
	summary, ok := contentExec.Result.(map[string]any)
	if !ok {
		return nil
	}
	sections, ok := summary["sections"].([]map[string]any)
	if !ok {
		return nil
	}
	for _, sec := range sections {
		if fmt.Sprint(sec["type"]) != sectionType {
			continue
		}
		items, ok := sec["items"].([]map[string]any)
		if !ok || len(items) == 0 {
			continue
		}
		return map[string]any{
			"sectionId":     sec["sectionId"],
			"sectionItemId": items[0]["id"],
		}
	}
	return nil
}

func testResolveResumeID(registry *mcp.Registry, ctx model.AssistantContextInput, userText string) string {
	if named := testNamedResumeQuery(userText); named != "" {
		if id := testFindResumeIDByTitle(registry, named); id != "" {
			return id
		}
	}
	if ctx.ResumeID != nil && *ctx.ResumeID != "" {
		return *ctx.ResumeID
	}
	list := registry.Execute("list_resumes", testMustJSON(map[string]any{}))
	if list.Error != "" || list.Result == nil {
		return ""
	}
	resumes, ok := list.Result.([]*model.Resume)
	if !ok || len(resumes) == 0 {
		return ""
	}
	return resumes[0].ID
}

func testNamedResumeQuery(userText string) string {
	lower := strings.ToLower(userText)
	if strings.Contains(lower, "my resume") || strings.Contains(lower, "this resume") ||
		strings.Contains(lower, "my cv") || strings.Contains(lower, "this cv") {
		return ""
	}
	m := testNamedResumePattern.FindStringSubmatch(userText)
	if len(m) != 2 {
		return ""
	}
	name := strings.TrimSpace(strings.ToLower(m[1]))
	name = strings.TrimPrefix(name, "the ")
	if name == "" {
		return ""
	}
	// "elon musks" → "elon musk"
	if strings.HasSuffix(name, "s") && !strings.HasSuffix(name, "ss") {
		name = name[:len(name)-1]
	}
	return name
}

func testFindResumeIDByTitle(registry *mcp.Registry, query string) string {
	list := registry.Execute("list_resumes", testMustJSON(map[string]any{}))
	if list.Error != "" || list.Result == nil {
		return ""
	}
	resumes, ok := list.Result.([]*model.Resume)
	if !ok {
		return ""
	}
	query = strings.ToLower(strings.TrimSpace(query))
	var bestID string
	bestScore := -1
	for _, r := range resumes {
		title := strings.ToLower(r.Title)
		score := -1
		switch {
		case title == query:
			score = 100
		case strings.Contains(title, query):
			score = len(query)
		case strings.Contains(query, title):
			score = len(title)
		}
		if score > bestScore {
			bestScore = score
			bestID = r.ID
		}
	}
	return bestID
}

func testExtractLocation(text string) string {
	if m := testLivesInPattern.FindStringSubmatch(text); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return ""
}

func testIsTwinIntent(lower string) bool {
	return strings.Contains(lower, "digital twin") ||
		strings.Contains(lower, "my twin") ||
		(strings.Contains(lower, "twin") && (strings.Contains(lower, "add") || strings.Contains(lower, "save") || strings.Contains(lower, "record")))
}

func testIsHideIntent(lower string) bool {
	return strings.Contains(lower, "hide") ||
		strings.Contains(lower, "remove from") ||
		(strings.Contains(lower, "don't show") && strings.Contains(lower, "cv"))
}

func testHideKeyword(lower string) string {
	for _, phrase := range []string{"bright labs", "acme", "acme corp"} {
		if strings.Contains(lower, phrase) {
			return phrase
		}
	}
	return ""
}

func testTwinEntryFromText(userText string) (title, body string) {
	body = strings.TrimSpace(userText)
	lower := strings.ToLower(body)
	for _, prefix := range []string{"add to my twin:", "add to digital twin:", "add to my twin", "add to digital twin"} {
		if strings.HasPrefix(lower, prefix) {
			body = strings.TrimSpace(body[len(prefix):])
			break
		}
	}
	title = body
	if len(title) > 80 {
		title = title[:80] + "…"
	}
	if title == "" {
		title = "New entry"
	}
	return title, body
}

func testExtractEmail(text string) string {
	return testEmailPattern.FindString(text)
}

func testExtractProfileName(text string) string {
	if m := testProfileNamePattern.FindStringSubmatch(strings.TrimSpace(text)); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return ""
}

func (s *Service) testHideItem(tools *mcp.Registry, resumeID, keyword string) (string, []mcp.Execution, bool) {
	if keyword == "" {
		return "", nil, false
	}
	var executions []mcp.Execution
	content := tools.Execute("get_resume_content", testMustJSON(map[string]string{"id": resumeID}))
	executions = append(executions, content)
	match := testFindItemByKeyword(content, keyword)
	if match == nil {
		return "", executions, false
	}
	hideExec := tools.Execute("set_item_visibility", testMustJSON(map[string]any{
		"resumeId":      resumeID,
		"sectionId":     match["sectionId"],
		"sectionItemId": match["sectionItemId"],
		"showInPreview": false,
	}))
	executions = append(executions, hideExec)
	if hideExec.Error != "" {
		return "", executions, false
	}
	label, _ := match["label"].(string)
	if label == "" {
		label = "that item"
	}
	return fmt.Sprintf("Hidden %s from your CV preview.", label), executions, true
}

func (s *Service) testAddExperience(tools *mcp.Registry, resumeID, userText string) (string, []mcp.Execution, bool) {
	var executions []mcp.Execution
	sections := tools.Execute("list_sections", testMustJSON(map[string]string{"type": "EXPERIENCE"}))
	executions = append(executions, sections)
	sectionID := testFirstSectionID(sections)
	if sectionID == "" {
		return "", executions, false
	}

	headline := "New experience"
	body := strings.TrimSpace(userText)
	metadata := map[string]any{}
	if m := testExperienceAtPattern.FindStringSubmatch(userText); len(m) == 3 {
		role := strings.TrimSpace(m[1])
		company := strings.TrimSpace(m[2])
		if role != "" && company != "" {
			headline = role + ", " + company
			body = userText
			metadata["company"] = company
		}
	}

	addExec := tools.Execute("add_section_item", testMustJSON(map[string]any{
		"resumeId":  resumeID,
		"sectionId": sectionID,
		"headline":  headline,
		"body":      body,
		"metadata":  metadata,
	}))
	executions = append(executions, addExec)
	if addExec.Error != "" {
		return "", executions, false
	}
	return fmt.Sprintf("Added %q to Work Experience.", headline), executions, true
}

func testFindItemByKeyword(contentExec mcp.Execution, keyword string) map[string]any {
	if contentExec.Error != "" || contentExec.Result == nil {
		return nil
	}
	needle := strings.ToLower(keyword)
	if content, ok := contentExec.Result.(*model.ResumeWithContent); ok {
		for _, swi := range content.Sections {
			for _, item := range swi.Items {
				haystack := strings.ToLower(item.Headline + " " + item.Body)
				if company, ok := item.Metadata["company"].(string); ok {
					haystack += " " + strings.ToLower(company)
				}
				if strings.Contains(haystack, needle) {
					return map[string]any{
						"sectionId":     swi.Section.ID,
						"sectionItemId": item.ID,
						"label":         item.Headline,
					}
				}
			}
		}
		return nil
	}
	summary, ok := contentExec.Result.(map[string]any)
	if !ok {
		return nil
	}
	sections, ok := summary["sections"].([]map[string]any)
	if !ok {
		return nil
	}
	for _, sec := range sections {
		sectionID, _ := sec["sectionId"].(string)
		items, ok := sec["items"].([]map[string]any)
		if !ok {
			continue
		}
		for _, item := range items {
			headline, _ := item["headline"].(string)
			body, _ := item["body"].(string)
			haystack := strings.ToLower(headline + " " + body)
			if meta, ok := item["metadata"].(map[string]any); ok {
				if company, ok := meta["company"].(string); ok {
					haystack += " " + strings.ToLower(company)
				}
			}
			if strings.Contains(haystack, needle) {
				itemID, _ := item["id"].(string)
				return map[string]any{
					"sectionId":     sectionID,
					"sectionItemId": itemID,
					"label":         headline,
				}
			}
		}
	}
	return nil
}
