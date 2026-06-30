package cv

import (
	"testing"

	"github.com/leo/ai-weekend/backend/graph/model"
)

func TestEffectiveContactPhotoURL(t *testing.T) {
	uploaded := "https://cdn.example.com/me.webp"
	linkedin := "https://media.licdn.com/photo.jpg"
	github := "https://avatars.githubusercontent.com/u/1"

	t.Run("prefers uploaded photo", func(t *testing.T) {
		got := EffectiveContactPhotoURL(&model.ContactProfile{
			PhotoURL:         &uploaded,
			LinkedinPhotoURL: &linkedin,
			GithubPhotoURL:   &github,
		})
		if got == nil || *got != uploaded {
			t.Fatalf("expected uploaded photo, got %#v", got)
		}
	})

	t.Run("falls back to linkedin then github", func(t *testing.T) {
		got := EffectiveContactPhotoURL(&model.ContactProfile{
			LinkedinPhotoURL: &linkedin,
			GithubPhotoURL:   &github,
		})
		if got == nil || *got != linkedin {
			t.Fatalf("expected linkedin photo, got %#v", got)
		}

		got = EffectiveContactPhotoURL(&model.ContactProfile{GithubPhotoURL: &github})
		if got == nil || *got != github {
			t.Fatalf("expected github photo, got %#v", got)
		}
	})

	t.Run("skips blank values", func(t *testing.T) {
		blank := "   "
		got := EffectiveContactPhotoURL(&model.ContactProfile{
			PhotoURL:         &blank,
			LinkedinPhotoURL: &linkedin,
		})
		if got == nil || *got != linkedin {
			t.Fatalf("expected linkedin photo after blank upload, got %#v", got)
		}
	})

	t.Run("nil profile", func(t *testing.T) {
		if got := EffectiveContactPhotoURL(nil); got != nil {
			t.Fatalf("expected nil, got %#v", got)
		}
	})
}
