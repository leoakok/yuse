package mcp

import "testing"

func TestIsImportableRepo(t *testing.T) {
	if !isImportableRepo(map[string]any{"fork": false}) {
		t.Fatal("expected non-fork to be importable")
	}
	if isImportableRepo(map[string]any{"fork": true}) {
		t.Fatal("expected empty fork to be skipped")
	}
	if !isImportableRepo(map[string]any{"fork": true, "description": "Side project"}) {
		t.Fatal("expected fork with description")
	}
	if !isImportableRepo(map[string]any{"fork": true, "stargazers_count": float64(3)}) {
		t.Fatal("expected fork with stars")
	}
}

func TestSelectImportReposSkipsEmptyForks(t *testing.T) {
	repos := []map[string]any{
		{"name": "main", "fork": false, "stargazers_count": float64(10)},
		{"name": "fork-empty", "fork": true, "stargazers_count": float64(0)},
		{"name": "fork-good", "fork": true, "description": "Hackathon", "stargazers_count": float64(1)},
		{"name": "second", "fork": false, "stargazers_count": float64(5)},
	}
	selected := selectImportRepos(repos, 5)
	if len(selected) != 3 {
		t.Fatalf("expected 3 importable repos, got %d", len(selected))
	}
}

func TestAggregateProgrammingLanguages(t *testing.T) {
	repos := []map[string]any{
		{"language": "Go"},
		{"language": "TypeScript"},
		{"language": "Go"},
		{"language": ""},
	}
	langs := aggregateProgrammingLanguages(repos)
	if len(langs) != 2 || langs[0] != "Go" || langs[1] != "TypeScript" {
		t.Fatalf("unexpected languages: %v", langs)
	}
}
