package mcp

// adminToolDefinitions returns MCP tools visible only to admin users.
func adminToolDefinitions() []toolDef {
	object := func(props map[string]any, required ...string) map[string]any {
		schema := map[string]any{
			"type":       "object",
			"properties": props,
		}
		if len(required) > 0 {
			schema["required"] = required
		}
		return schema
	}
	str := func(desc string, examples ...string) map[string]any {
		p := map[string]any{"type": "string", "description": desc}
		if len(examples) > 0 {
			p["examples"] = examples
		}
		return p
	}
	boolProp := func(desc string) map[string]any {
		return map[string]any{"type": "boolean", "description": desc}
	}
	intProp := func(desc string, min, max int) map[string]any {
		p := map[string]any{"type": "integer", "description": desc}
		if min > 0 {
			p["minimum"] = min
		}
		if max > 0 {
			p["maximum"] = max
		}
		return p
	}

	return []toolDef{
		{
			Name: "search_linkedin_jobs",
			Description: "Search LinkedIn job postings with saved session credentials. Results exclude companies you banned and jobs you already applied to. Use this instead of web_search for LinkedIn job discovery.",
			Parameters: object(map[string]any{
				"keywords":          str("Optional job title or keyword filter.", "golang engineer"),
				"geoId":             str("LinkedIn geoId for location filter.", "102424322"),
				"timeFilter":        str("Time posted filter code (default r86400 = last 24 hours).", "r86400"),
				"sortBy":            str("DATE_DESC or RELEVANCE.", "DATE_DESC"),
				"maxResults":        intProp("Max jobs to return after filtering (1-350).", 1, 350),
				"easyApply":         boolProp("Only Easy Apply jobs."),
			}),
		},
		{
			Name: "list_linkedin_applications",
			Description: "List your synced LinkedIn job applications with recruiter status (viewed, resume downloaded, rejected). Data is refreshed by the backend on a schedule.",
			Parameters: object(map[string]any{
				"limit":  intProp("Max applications to return (1-100).", 1, 100),
				"offset": intProp("Pagination offset.", 0, 10000),
			}),
		},
	}
}

// visibleToolDefinitions returns the tool list for the given admin flag.
func visibleToolDefinitions(isAdmin bool) []toolDef {
	defs := publicToolDefinitions()
	if isAdmin {
		defs = append(defs, adminToolDefinitions()...)
	}
	return defs
}

func isAdminOnlyTool(name string) bool {
	for _, def := range adminToolDefinitions() {
		if def.Name == name {
			return true
		}
	}
	return false
}
