import { createResume, updateResumeSettings } from "@/lib/api/cv-api";
import type { DesignPresetId, ResumeSettings } from "@/lib/types/cv";
import type { TailorShowcaseExample } from "@/lib/landing/tailor-demo-content";

const STORAGE_KEY = "yuse:pending-showcase-design";

export type PendingShowcaseDesign = {
  styleLabel: string;
  designPresetId: DesignPresetId;
  settings: Omit<ResumeSettings, "resumeId">;
};

export function pendingDesignFromShowcase(
  example: TailorShowcaseExample,
): PendingShowcaseDesign {
  const { resumeId: _resumeId, ...settings } = example.preview.settings;
  return {
    styleLabel: example.styleLabel,
    designPresetId: settings.designPresetId,
    settings,
  };
}

export function stashPendingShowcaseDesign(design: PendingShowcaseDesign): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function takePendingShowcaseDesign(): PendingShowcaseDesign | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PendingShowcaseDesign;
  } catch {
    return null;
  }
}

/** Create a new resume using a landing showcase design. */
export async function createResumeFromShowcaseDesign(
  design: PendingShowcaseDesign,
) {
  const resume = await createResume(`${design.styleLabel} resume`);
  await updateResumeSettings(resume.id, design.settings);
  return resume;
}
