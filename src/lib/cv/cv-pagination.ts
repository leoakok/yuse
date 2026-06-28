import type { ContactProfile, Section, SectionItem } from "@/lib/types/cv";

export type CvBlock =
  | { kind: "header"; contactProfile: ContactProfile }
  | { kind: "section-title"; section: Section }
  | { kind: "item"; section: Section; item: SectionItem };

export interface CvBlockMetrics {
  blockIndex: number;
  height: number;
  gapAfter: number;
}

export function buildCvBlocks(
  contactProfile: ContactProfile | undefined,
  sections: { section: Section; items: SectionItem[] }[]
): CvBlock[] {
  const blocks: CvBlock[] = [];

  if (contactProfile) {
    blocks.push({ kind: "header", contactProfile });
  }

  for (const { section, items } of sections) {
    const visibleItems = items.filter((item) => item.showInPreview);
    if (visibleItems.length === 0) continue;

    blocks.push({ kind: "section-title", section });
    for (const item of visibleItems) {
      blocks.push({ kind: "item", section, item });
    }
  }

  return blocks;
}

export function measureCvBlocks(container: HTMLElement): CvBlockMetrics[] {
  const elements = container.querySelectorAll<HTMLElement>("[data-cv-block-index]");
  if (elements.length === 0) return [];

  const containerTop = container.getBoundingClientRect().top;
  const positions = Array.from(elements).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top - containerTop,
      bottom: rect.bottom - containerTop,
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

/** Whether a section title should appear before this item on the rendered page. */
export function shouldShowSectionTitleForItem(
  itemBlock: CvBlock & { kind: "item" },
  prevOnPage: CvBlock | null,
  prevGlobal: CvBlock | null
): boolean {
  if (prevOnPage?.kind === "section-title") {
    return false;
  }
  if (prevOnPage?.kind === "item" && prevOnPage.section.id === itemBlock.section.id) {
    return false;
  }
  if (prevOnPage !== null) {
    return true;
  }

  if (!prevGlobal) return true;
  if (prevGlobal.kind === "header") return true;
  if (prevGlobal.kind === "section-title" && prevGlobal.section.id === itemBlock.section.id) {
    return true;
  }
  if (prevGlobal.kind === "item" && prevGlobal.section.id === itemBlock.section.id) {
    return false;
  }
  return true;
}

/**
 * Map paginated block indices to render blocks, inserting section titles only when
 * a section starts on the page (including orphaned titles from the previous page).
 */
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

    if (block.kind === "item") {
      const prevOnPage = i > 0 ? blocks[pageIndices[i - 1]] ?? null : null;
      const prevContext = prevOnPage ?? prevGlobal;
      if (shouldShowSectionTitleForItem(block, prevOnPage, prevContext)) {
        result.push({ kind: "section-title", section: block.section });
      }
    }

    result.push(block);
  }

  return result;
}

/** @deprecated Use resolvePageBlocks — kept for callers migrating off injected titles. */
export function expandPageBlocks(
  pageIndices: number[],
  blocks: CvBlock[],
  prevPageLastIndex: number | null = null
): CvBlock[] {
  return resolvePageBlocks(pageIndices, blocks, prevPageLastIndex);
}
