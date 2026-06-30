import type { ResumeWithContent } from "@/lib/types/cv";
import { isItemShownInPreview, isSectionShownInPreview } from "@/lib/cv/preview-visibility";
import { stripMarkdown } from "@/lib/markdown/render";
import { sectionDisplayTitle } from "@/lib/cv/resume-design";
import {
  formatItemHeadline,
  getSectionItemSubtitle,
} from "@/lib/cv/section-item-display";

function formatDateRange(metadata: Record<string, string | undefined>): string | null {
  const start = metadata.startDate;
  const end = metadata.endDate;
  if (!start && !end) return null;
  if (!end) return `${start} – Present`;
  return `${start} – ${end}`;
}

export function exportResumePlainText(content: ResumeWithContent): string {
  const lines: string[] = [];
  const { contactProfile, settings } = content;
  const ats = settings.atsMode;

  if (contactProfile) {
    lines.push(contactProfile.fullName);
    if (contactProfile.headline) lines.push(contactProfile.headline);
    const contactParts = [
      contactProfile.email,
      contactProfile.phone,
      contactProfile.location,
      contactProfile.website,
    ].filter(Boolean);
    if (contactParts.length) lines.push(contactParts.join(" | "));
    lines.push("");
  }

  for (const { section, displayTitle, items, showInPreview } of content.sections) {
    if (!isSectionShownInPreview(showInPreview)) continue;
    const visible = items.filter((item) => isItemShownInPreview(item.showInPreview));
    if (visible.length === 0) continue;

    lines.push(sectionDisplayTitle(section, displayTitle).toUpperCase());
    lines.push(ats ? "-" : "=".repeat(Math.min(40, section.title.length + 4)));

    for (const item of visible) {
      const dates = formatDateRange(item.metadata);
      const headline = formatItemHeadline(item);
      const subtitle = getSectionItemSubtitle(item);
      const titleLine = subtitle ? `${headline}, ${subtitle}` : headline;
      lines.push(dates ? `${titleLine} (${dates})` : titleLine);

      if (item.metadata.location && settings.locationDisplay !== "HIDDEN") {
        lines.push(item.metadata.location);
      }

      if (item.body.trim()) {
        const body = stripMarkdown(item.body);
        for (const paragraph of body.split(/\n{2,}/)) {
          const trimmed = paragraph.trim();
          if (trimmed) lines.push(trimmed);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
