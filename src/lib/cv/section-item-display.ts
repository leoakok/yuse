import type { SectionItem } from "@/lib/types/cv";
import { formatLevelLabel } from "@/lib/cv/levels";

/** Secondary line under the headline (company, school, etc.). */
export function getSectionItemSubtitle(item: SectionItem): string | null {
  const { metadata, type } = item;
  switch (type) {
    case "EXPERIENCE":
      return metadata.company?.trim() || null;
    case "EDUCATION":
      return metadata.institution?.trim() || null;
    case "VOLUNTEER":
      return metadata.institution?.trim() || null;
    case "PROJECTS":
      return metadata.company?.trim() || null;
    default:
      return null;
  }
}

/** Headline with inline level for skills and languages. */
export function formatItemHeadline(item: SectionItem): string {
  if (item.type === "SKILLS" || item.type === "LANGUAGES") {
    const level = formatLevelLabel(metadataLevel(item));
    if (level) return `${item.headline} (${level})`;
  }
  return item.headline;
}

function metadataLevel(item: SectionItem): string | undefined {
  return item.metadata.level;
}

/** One-line summary for editor list rows. */
export function formatItemRowDetail(item: SectionItem): string | null {
  const subtitle = getSectionItemSubtitle(item);
  if (subtitle) return subtitle;
  if (item.type === "SKILLS" || item.type === "LANGUAGES") {
    return formatLevelLabel(metadataLevel(item));
  }
  if (item.metadata.location?.trim()) return item.metadata.location;
  return null;
}
