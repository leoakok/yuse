import type {
  ItemTitleOrder,
  ItemTitleSeparator,
  SectionItem,
} from "@/lib/types/cv";
import { formatLevelLabel } from "@/lib/cv/levels";

const ITEM_TITLE_SEPARATOR_CHARS: Record<ItemTitleSeparator, string> = {
  DOT: "·",
  PIPE: "|",
  COMMA: ",",
};

export type InlineItemLine = {
  left: string;
  right: string;
  separator: ItemTitleSeparator;
};

/** Left/right fields for inline titles; order-aware for future title/company swap. */
export function getInlineItemTitleFields(
  item: SectionItem,
  order: ItemTitleOrder = "TITLE_FIRST"
): { left: string; right: string } | null {
  const secondary = getSectionItemSubtitle(item);
  if (!secondary) return null;

  const primary = formatItemHeadline(item);
  if (order === "COMPANY_FIRST") {
    return { left: secondary, right: primary };
  }
  return { left: primary, right: secondary };
}

function separatorGlue(separator: ItemTitleSeparator): string {
  const char = ITEM_TITLE_SEPARATOR_CHARS[separator];
  if (separator === "COMMA") {
    return `, `;
  }
  return ` ${char} `;
}

/** Plain-text inline title line: left + separator + right. */
export function formatInlineItemLine({
  left,
  right,
  separator,
}: InlineItemLine): string {
  return `${left}${separatorGlue(separator)}${right}`;
}

/**
 * Styled inline title parts: comma sticks to the left (primary) segment;
 * dot/pipe separators sit between segments with spaces on both sides.
 */
export function getInlineItemLineParts({
  left,
  right,
  separator,
}: InlineItemLine): { primary: string; secondary: string } {
  if (separator === "COMMA") {
    return { primary: `${left},`, secondary: ` ${right}` };
  }
  const char = ITEM_TITLE_SEPARATOR_CHARS[separator];
  return { primary: left, secondary: ` ${char} ${right}` };
}

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
