package mcp

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"
)

var jsonLDPattern = regexp.MustCompile(`(?is)<script[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>(.*?)</script>`)

// extractJSONLDBlocks parses Person / CreativeWork / Organization nodes from HTML.
func extractJSONLDBlocks(html string) []map[string]any {
	var out []map[string]any
	for _, match := range jsonLDPattern.FindAllStringSubmatch(html, -1) {
		if len(match) < 2 {
			continue
		}
		raw := strings.TrimSpace(match[1])
		if raw == "" {
			continue
		}
		var parsed any
		if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
			continue
		}
		collectJSONLDNodes(parsed, &out)
	}
	return out
}

func collectJSONLDNodes(node any, out *[]map[string]any) {
	switch v := node.(type) {
	case map[string]any:
		if typ := jsonLDType(v); typ != "" {
			*out = append(*out, v)
		}
		if graph, ok := v["@graph"].([]any); ok {
			for _, child := range graph {
				collectJSONLDNodes(child, out)
			}
		}
	case []any:
		for _, child := range v {
			collectJSONLDNodes(child, out)
		}
	}
}

func jsonLDType(node map[string]any) string {
	raw, _ := node["@type"].(string)
	if raw != "" {
		return strings.ToLower(raw)
	}
	if types, ok := node["@type"].([]any); ok && len(types) > 0 {
		if s, ok := types[0].(string); ok {
			return strings.ToLower(s)
		}
	}
	return ""
}

func profileFromJSONLD(nodes []map[string]any) map[string]any {
	for _, node := range nodes {
		typ := jsonLDType(node)
		if typ != "person" && typ != "profilepage" {
			continue
		}
		profile := map[string]any{}
		if name, ok := node["name"].(string); ok && name != "" {
			profile["name"] = name
		}
		if title, ok := node["jobTitle"].(string); ok && title != "" {
			profile["headline"] = title
		}
		if desc, ok := node["description"].(string); ok && desc != "" {
			profile["bio"] = desc
		}
		if url, ok := node["url"].(string); ok && url != "" {
			profile["url"] = url
		}
		if len(profile) > 0 {
			return profile
		}
	}
	return nil
}

func importItemsFromJSONLD(nodes []map[string]any) []map[string]any {
	seen := map[string]bool{}
	var out []map[string]any
	workTypes := map[string]bool{
		"creativework": true, "softwareapplication": true, "project": true,
		"website": true, "article": true, "scholarlyarticle": true,
	}
	for _, node := range nodes {
		typ := jsonLDType(node)
		if !workTypes[typ] {
			continue
		}
		item := importItemFromJSONLDNode(node)
		if item == nil {
			continue
		}
		key := strings.ToLower(readStringField(item, "title") + "|" + readStringField(item, "url"))
		if key == "|" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}

func importItemFromJSONLDNode(node map[string]any) map[string]any {
	title, _ := node["name"].(string)
	if title == "" {
		title, _ = node["headline"].(string)
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return nil
	}
	desc, _ := node["description"].(string)
	url, _ := node["url"].(string)
	item := map[string]any{
		"twinType":          "PROJECT",
		"title":             title,
		"description":       strings.TrimSpace(desc),
		"url":               strings.TrimSpace(url),
		"suggestedSections": []string{"PROJECTS"},
		"source":            "json_ld",
	}
	if desc != "" {
		item["suggestedProblem"] = desc
	}
	return item
}

func importItemsFromPages(pages []map[string]any) []map[string]any {
	seen := map[string]bool{}
	var out []map[string]any

	for _, page := range pages {
		url, _ := page["url"].(string)
		body, _ := page["body"].(string)
		if body == "" {
			continue
		}
		for _, node := range extractJSONLDBlocks(body) {
			item := importItemFromJSONLDNode(node)
			if item == nil {
				continue
			}
			if readStringField(item, "url") == "" && url != "" {
				item["url"] = url
			}
			key := itemKey(item)
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, item)
		}
		for _, item := range extractProjectLinksFromHTML(body, url) {
			key := itemKey(item)
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, item)
		}
	}

	sort.SliceStable(out, func(i, j int) bool {
		return readStringField(out[i], "title") < readStringField(out[j], "title")
	})
	return out
}

var projectPathHints = []string{"/project", "/projects", "/portfolio", "/work/", "/case-study", "/case-studies"}

func extractProjectLinksFromHTML(html, pageURL string) []map[string]any {
	base, err := parseURL(pageURL)
	if err != nil {
		return nil
	}
	seen := map[string]bool{}
	var out []map[string]any
	for _, match := range hrefPattern.FindAllStringSubmatch(html, -1) {
		if len(match) < 2 {
			continue
		}
		resolved, ok := resolveInternalLink(strings.TrimSpace(match[1]), base)
		if !ok {
			continue
		}
		lower := strings.ToLower(resolved)
		if !linkLooksLikeProject(lower) {
			continue
		}
		if seen[canonicalPageURL(resolved)] {
			continue
		}
		seen[canonicalPageURL(resolved)] = true
		title := titleFromProjectURL(resolved)
		if title == "" {
			continue
		}
		out = append(out, map[string]any{
			"twinType":          "PROJECT",
			"title":             title,
			"url":               resolved,
			"suggestedSections": []string{"PROJECTS"},
			"source":            "page_link",
		})
	}
	return out
}

func linkLooksLikeProject(link string) bool {
	for _, hint := range projectPathHints {
		if strings.Contains(link, hint) {
			return true
		}
	}
	return false
}

func titleFromProjectURL(raw string) string {
	u, err := parseURL(raw)
	if err != nil {
		return ""
	}
	segments := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(segments) == 0 {
		return ""
	}
	last := segments[len(segments)-1]
	last = strings.ReplaceAll(last, "-", " ")
	last = strings.ReplaceAll(last, "_", " ")
	return strings.TrimSpace(last)
}

func itemKey(item map[string]any) string {
	return strings.ToLower(readStringField(item, "title") + "|" + readStringField(item, "url"))
}

func readStringField(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return strings.TrimSpace(v)
}

func parseURL(raw string) (*url.URL, error) {
	raw = normalizeFetchURL(raw)
	return url.Parse(raw)
}

func normalizeGitHubImportItems(importRepos []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(importRepos))
	for _, repo := range importRepos {
		title := readStringField(repo, "title")
		if title == "" {
			title = readStringField(repo, "name")
		}
		if title == "" {
			continue
		}
		item := map[string]any{
			"twinType":          "PROJECT",
			"title":             title,
			"description":       readStringField(repo, "description"),
			"url":               readStringField(repo, "url"),
			"suggestedSections": []string{"PROJECTS"},
			"source":            "github",
		}
		if v := repo["suggestedProblem"]; v != nil {
			item["suggestedProblem"] = v
		}
		if v := repo["suggestedResult"]; v != nil {
			item["suggestedResult"] = v
		}
		if lang := readStringField(repo, "language"); lang != "" {
			item["suggestedAction"] = lang
		}
		out = append(out, item)
	}
	return out
}

func buildImportNote(count int, siteKind string) string {
	return fmt.Sprintf(
		"Create one create_twin_entry per item in importItems (%d from %s). "+
			"Batch all items this turn, do not stop after one. "+
			"Use suggestedProblem/suggestedAction/suggestedResult for PAR fields when thin. "+
			"Skip STAR follow-ups for imports. "+
			"When building a CV, add_section_item on the suggested section for each item.",
		count, siteKind,
	)
}
