import type { ColumnLayout, SectionType, SidebarPosition, SidebarWidth } from "@/lib/types/cv";

/** Resume-wide section column layout (main column vs sidebar). Not to be confused with
 *  `itemTitleLayout`, which controls inline vs stacked titles within a single entry. */
const SIDEBAR_SECTION_TYPES = new Set<SectionType>([
  "SKILLS",
  "EDUCATION",
  "LANGUAGES",
  "CERTIFICATIONS",
  "AWARDS",
]);

export function isSidebarSection(type: SectionType): boolean {
  return SIDEBAR_SECTION_TYPES.has(type);
}

export function resolveSidebarWidthPercent(width: SidebarWidth | undefined): number {
  switch (width) {
    case "NARROW":
      return 28;
    case "WIDE":
      return 38;
    default:
      return 33;
  }
}

/** True when sections are split into a main column and a sidebar (e.g. skills in sidebar). */
export function isTwoColumnLayout(layout: ColumnLayout | undefined): boolean {
  return layout === "TWO_COLUMN";
}

export function sidebarFlexDirection(position: SidebarPosition | undefined): "row" | "row-reverse" {
  return position === "RIGHT" ? "row-reverse" : "row";
}
