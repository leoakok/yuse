import type { DesignPresetId, ResumeWithContent } from "@/lib/types/cv";
import { applyDesignPreset, getDesignPresetBundle, getDesignPresetLabel } from "@/lib/cv/design-presets";
import { buildDummyPreviewContent } from "@/lib/cv/dummy-preview-content";
import { defaultResumeSettings } from "@/lib/cv/resume-settings";
import type { CvTheme } from "@/lib/types/theme";

const PREVIEW_RESUME_ID = "theme-preview-resume";

function themeForPreset(presetId: DesignPresetId): CvTheme {
  const bundle = getDesignPresetBundle(presetId);
  const label = getDesignPresetLabel(presetId);
  return {
    id: bundle.themeId,
    name: label,
    slug: presetId.toLowerCase(),
    isSystem: true,
    config: { fontFamily: bundle.fontFamily.toLowerCase() },
  };
}

export function buildThemePreviewContent(presetId: DesignPresetId): ResumeWithContent {
  const baseSettings = defaultResumeSettings(PREVIEW_RESUME_ID);
  const settings = {
    ...baseSettings,
    ...applyDesignPreset(baseSettings, presetId),
  };

  return buildDummyPreviewContent(
    settings,
    themeForPreset(presetId),
    PREVIEW_RESUME_ID,
  );
}
