import type {
  CertificationsLayout,
  ContactProfile,
  LanguagesLayout,
  Section,
  SectionItem,
  SkillsLayout,
} from "@/lib/types/cv";
import { isItemShownInPreview, isSectionShownInPreview } from "@/lib/cv/preview-visibility";

export type CvBlock =
  | { kind: "header"; contactProfile: ContactProfile }
  | { kind: "section-title"; section: Section; displayTitle?: string | null }
  | { kind: "item"; section: Section; item: SectionItem }
  | { kind: "skills"; section: Section; items: SectionItem[] }
  | { kind: "languages"; section: Section; items: SectionItem[]; layout: LanguagesLayout }
  | { kind: "certifications"; section: Section; items: SectionItem[]; layout: CertificationsLayout };

export interface CvBlockMetrics {
  blockIndex: number;
  height: number;
  gapAfter: number;
}

export function buildCvBlocks(
  contactProfile: ContactProfile | undefined,
  sections: {
    section: Section;
    items: SectionItem[];
    showInPreview?: boolean;
    displayTitle?: string | null;
  }[],
  options: {
    skillsLayout?: SkillsLayout;
    languagesLayout?: LanguagesLayout;
    certificationsLayout?: CertificationsLayout;
  } = {}
): CvBlock[] {
  const skillsLayout = options.skillsLayout ?? "LIST";
  const languagesLayout = options.languagesLayout ?? "LIST";
  const certificationsLayout = options.certificationsLayout ?? "LIST";
  const blocks: CvBlock[] = [];

  if (contactProfile) {
    blocks.push({ kind: "header", contactProfile });
  }

  for (const entry of sections) {
    if (!isSectionShownInPreview(entry.showInPreview)) continue;

    const visibleItems = entry.items.filter((item) => isItemShownInPreview(item.showInPreview));
    if (visibleItems.length === 0) continue;

    const { section } = entry;
    blocks.push({
      kind: "section-title",
      section,
      displayTitle: entry.displayTitle,
    });

    if (section.type === "SKILLS" && skillsLayout !== "LIST") {
      blocks.push({ kind: "skills", section, items: visibleItems });
      continue;
    }

    if (section.type === "LANGUAGES" && languagesLayout !== "LIST") {
      blocks.push({ kind: "languages", section, items: visibleItems, layout: languagesLayout });
      continue;
    }

    if (section.type === "CERTIFICATIONS" && certificationsLayout === "COMPACT") {
      blocks.push({
        kind: "certifications",
        section,
        items: visibleItems,
        layout: certificationsLayout,
      });
      continue;
    }

    for (const item of visibleItems) {
      blocks.push({ kind: "item", section, item });
    }
  }

  return blocks;
}

export function measureCvBlocks(container: HTMLElement): CvBlockMetrics[] {
  const elements = container.querySelectorAll<HTMLElement>("[data-cv-block-index]");
  if (elements.length === 0) return [];

  const containerRect = container.getBoundingClientRect();
  const layoutWidth = container.offsetWidth;
  const scale = layoutWidth > 0 ? containerRect.width / layoutWidth : 1;
  const safeScale = scale > 0 ? scale : 1;

  const containerTop = containerRect.top;
  const positions = Array.from(elements).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: (rect.top - containerTop) / safeScale,
      bottom: (rect.bottom - containerTop) / safeScale,
    };
  });

  return positions.map((pos, index) => ({
    blockIndex: Number(
      elements[index]?.getAttribute("data-cv-block-index") ?? index
    ),
    height: pos.bottom - pos.top,
    gapAfter:
      index < positions.length - 1
        ? Math.max(0, positions[index + 1].top - pos.bottom)
        : 0,
  }));
}

export function paginateCvBlocks(
  metrics: CvBlockMetrics[],
  maxHeight: number
): number[][] {
  if (metrics.length === 0) return [[]];

  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;

  for (let i = 0; i < metrics.length; i++) {
    const { height } = metrics[i];
    const gap = current.length > 0 ? metrics[i - 1].gapAfter : 0;
    const needed = gap + height;

    if (current.length > 0 && used + needed > maxHeight) {
      pages.push(current);
      current = [metrics[i].blockIndex];
      used = height;
    } else {
      used += needed;
      current.push(metrics[i].blockIndex);
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

export function pageIndicesEqual(a: number[][] | null, b: number[][]): boolean {
  if (a == null) return false;
  if (a.length !== b.length) return false;
  return a.every((page, pageIndex) => {
    const other = b[pageIndex];
    return page.length === other.length && page.every((value, i) => value === other[i]);
  });
}

/** Whether a section title should appear before this content block on the rendered page. */
export function shouldShowSectionTitleForContent(
  block: CvBlock & { kind: "item" | "skills" | "languages" | "certifications" },
  prevOnPage: CvBlock | null,
  prevGlobal: CvBlock | null
): boolean {
  if (prevOnPage?.kind === "section-title") {
    return false;
  }
  const sectionId = block.section.id;
  if (prevOnPage?.kind === "item" && prevOnPage.section.id === sectionId) {
    return false;
  }
  if (
    (prevOnPage?.kind === "skills" ||
      prevOnPage?.kind === "languages" ||
      prevOnPage?.kind === "certifications") &&
    prevOnPage.section.id === sectionId
  ) {
    return false;
  }
  if (prevOnPage !== null) {
    return true;
  }

  if (!prevGlobal) return true;
  if (prevGlobal.kind === "header") return true;
  if (prevGlobal.kind === "section-title" && prevGlobal.section.id === sectionId) {
    return true;
  }
  if (prevGlobal.kind === "item" && prevGlobal.section.id === sectionId) {
    return false;
  }
  if (
    (prevGlobal.kind === "skills" ||
      prevGlobal.kind === "languages" ||
      prevGlobal.kind === "certifications") &&
    prevGlobal.section.id === sectionId
  ) {
    return false;
  }
  return true;
}

/** @deprecated Use shouldShowSectionTitleForContent */
export function shouldShowSectionTitleForItem(
  itemBlock: CvBlock & { kind: "item" },
  prevOnPage: CvBlock | null,
  prevGlobal: CvBlock | null
): boolean {
  return shouldShowSectionTitleForContent(itemBlock, prevOnPage, prevGlobal);
}

export function resolvePageBlocks(
  pageIndices: number[],
  blocks: CvBlock[],
  prevPageLastIndex: number | null
): CvBlock[] {
  const result: CvBlock[] = [];
  const prevGlobal =
    prevPageLastIndex != null && prevPageLastIndex >= 0
      ? blocks[prevPageLastIndex] ?? null
      : null;

  for (let i = 0; i < pageIndices.length; i++) {
    const block = blocks[pageIndices[i]];
    if (!block) continue;

    if (
      block.kind === "item" ||
      block.kind === "skills" ||
      block.kind === "languages" ||
      block.kind === "certifications"
    ) {
      const prevOnPage = i > 0 ? blocks[pageIndices[i - 1]] ?? null : null;
      const prevContext = prevOnPage ?? prevGlobal;
      if (shouldShowSectionTitleForContent(block, prevOnPage, prevContext)) {
        const titleBlock = blocks.find(
          (candidate) =>
            candidate.kind === "section-title" && candidate.section.id === block.section.id
        );
        result.push(
          titleBlock?.kind === "section-title"
            ? titleBlock
            : { kind: "section-title", section: block.section }
        );
      }
    }

    result.push(block);
  }

  return result;
}

/** @deprecated Use resolvePageBlocks */
export function expandPageBlocks(
  pageIndices: number[],
  blocks: CvBlock[],
  prevPageLastIndex: number | null = null
): CvBlock[] {
  return resolvePageBlocks(pageIndices, blocks, prevPageLastIndex);
}
