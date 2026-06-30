"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ContactProfile, ItemTitleLayout, ResumeWithContent, Section, SectionItem } from "@/lib/types/cv";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import {
  buildCvBlocks,
  measureCvBlocks,
  paginateCvBlocks,
  resolvePageBlocks,
  type CvBlock,
} from "@/lib/cv/cv-pagination";
import {
  getPageFormatSpec,
  getPageMargins,
  getPagePaddingStyle,
  getUsablePageHeightPx,
} from "@/lib/cv/page-format";
import { MarkdownContent } from "@/lib/markdown/render";
import {
  formatItemHeadline,
  getSectionItemSubtitle,
} from "@/lib/cv/section-item-display";
import { resolveCvTypography, type CvTypography } from "@/lib/cv/typography";
import { cn } from "@/lib/utils";

interface CvPreviewProps {
  content: ResumeWithContent;
  className?: string;
  /** When true, only the first page is shown (e.g. grid thumbnails). */
  singlePage?: boolean;
  /** Gap between stacked pages in the live preview. */
  pageGapClassName?: string;
}

function formatDateRange(metadata: Record<string, string | undefined>) {
  const start = metadata.startDate;
  const end = metadata.endDate;
  if (!start && !end) return null;
  if (!end) return `${start} – Present`;
  return `${start} – ${end}`;
}

function CvPreviewHeader({
  contactProfile,
  showPhoto = false,
  typography,
}: {
  contactProfile: ContactProfile;
  showPhoto?: boolean;
  typography: CvTypography;
}) {
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  const photoVisible = showPhoto && photoUrl;

  return (
    <header className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div className={cn("flex gap-4", photoVisible ? "items-start" : undefined)}>
        {photoVisible ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: `${typography.contactNamePx}px` }}
          >
            {contactProfile.fullName}
          </h1>
          {contactProfile.headline ? (
            <p
              className="mt-1 text-zinc-600 dark:text-zinc-400"
              style={{ fontSize: `${typography.contactHeadlinePx}px` }}
            >
              {contactProfile.headline}
            </p>
          ) : null}
          <div
            className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-zinc-500"
            style={{ fontSize: `${typography.contactDetailsPx}px` }}
          >
            {contactProfile.email ? <span>{contactProfile.email}</span> : null}
            {contactProfile.phone ? <span>{contactProfile.phone}</span> : null}
            {contactProfile.location ? <span>{contactProfile.location}</span> : null}
            {contactProfile.website ? <span>{contactProfile.website}</span> : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function CvPreviewSectionTitle({
  section,
  typography,
}: {
  section: Section;
  typography: CvTypography;
}) {
  return (
    <h2
      className="mb-2 border-b border-zinc-300 font-semibold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
      style={{ fontSize: `${typography.sectionTitlePx}px` }}
    >
      {section.title}
    </h2>
  );
}

function CvPreviewItem({
  item,
  itemTitleLayout,
  typography,
}: {
  item: SectionItem;
  itemTitleLayout: ItemTitleLayout;
  typography: CvTypography;
}) {
  const dates = formatDateRange(item.metadata);
  const subtitle = getSectionItemSubtitle(item);
  const headline = formatItemHeadline(item);
  const inline = itemTitleLayout === "INLINE" && subtitle;
  const metaStyle = { fontSize: `${typography.itemMetaPx}px` };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          {inline ? (
            <h3 className="font-semibold" style={{ fontSize: `${typography.itemTitlePx}px` }}>
              {headline}
              <span className="font-normal text-zinc-500" style={metaStyle}>
                {" "}
                · {subtitle}
              </span>
            </h3>
          ) : (
            <h3
              className="font-semibold"
              style={{ fontSize: `${typography.itemTitlePx}px` }}
            >
              {headline}
            </h3>
          )}
        </div>
        {dates ? (
          <span className="shrink-0 text-zinc-500" style={metaStyle}>
            {dates}
          </span>
        ) : null}
      </div>
      {!inline && subtitle ? (
        <p className="text-zinc-500" style={metaStyle}>
          {subtitle}
        </p>
      ) : null}
      {item.type === "EXPERIENCE" && item.metadata.location ? (
        <p className="text-zinc-500" style={metaStyle}>
          {item.metadata.location}
        </p>
      ) : null}
      {item.body ? (
        <div style={{ fontSize: `${typography.bodyPx}px` }}>
          <MarkdownContent
            content={item.body}
            className="mt-1 text-zinc-700 dark:text-zinc-300"
          />
        </div>
      ) : null}
    </div>
  );
}

function groupPageBlocks(pageBlocks: CvBlock[]) {
  const groups: { section: Section | null; blocks: CvBlock[] }[] = [];
  let current: { section: Section | null; blocks: CvBlock[] } | null = null;

  for (const block of pageBlocks) {
    if (block.kind === "header") {
      if (current) groups.push(current);
      groups.push({ section: null, blocks: [block] });
      current = null;
      continue;
    }

    if (block.kind === "section-title") {
      if (current) groups.push(current);
      current = { section: block.section, blocks: [block] };
      continue;
    }

    if (!current) {
      current = { section: block.section, blocks: [block] };
    } else {
      current.blocks.push(block);
    }
  }

  if (current) groups.push(current);
  return groups;
}

function CvPreviewPage({
  pageBlocks,
  page,
  typography,
  pagePadding,
  showPhoto,
  itemTitleLayout,
  className,
  fixedHeight,
}: {
  pageBlocks: CvBlock[];
  page: ReturnType<typeof getPageFormatSpec>;
  typography: CvTypography;
  pagePadding: string;
  showPhoto?: boolean;
  itemTitleLayout: ItemTitleLayout;
  className?: string;
  fixedHeight?: boolean;
}) {
  const groups = groupPageBlocks(pageBlocks);

  return (
    <article
      className={cn(
        "rounded-sm bg-white text-zinc-900 shadow-lg ring-1 ring-black/5 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/10",
        "box-border shrink-0 overflow-hidden",
        className
      )}
      style={{
        width: page.width,
        padding: pagePadding,
        fontSize: `${typography.bodyPx}px`,
        ...(fixedHeight
          ? { height: page.minHeight, minHeight: page.minHeight }
          : { minHeight: page.minHeight }),
      }}
    >
      {groups.map((group, index) => {
        if (group.section === null) {
          const block = group.blocks[0];
          return (
            <div key={`header-${index}`}>
              {block?.kind === "header" ? (
                <CvPreviewHeader
                  contactProfile={block.contactProfile}
                  showPhoto={showPhoto}
                  typography={typography}
                />
              ) : null}
            </div>
          );
        }

        const titleBlock = group.blocks.find((b) => b.kind === "section-title");
        const items = group.blocks.filter((b) => b.kind === "item");

        return (
          <section key={`${group.section.id}-${index}`} className={index > 0 ? "mt-5" : undefined}>
            {titleBlock ? (
              <CvPreviewSectionTitle section={titleBlock.section} typography={typography} />
            ) : null}
            <div className="space-y-3">
              {items.map((block) =>
                block.kind === "item" ? (
                  <CvPreviewItem
                    key={block.item.id}
                    item={block.item}
                    itemTitleLayout={itemTitleLayout}
                    typography={typography}
                  />
                ) : null
              )}
            </div>
          </section>
        );
      })}
    </article>
  );
}

function CvPreviewMeasureLayout({
  blocks,
  page,
  typography,
  pagePadding,
  showPhoto,
  itemTitleLayout,
  measureRef,
}: {
  blocks: CvBlock[];
  page: ReturnType<typeof getPageFormatSpec>;
  typography: CvTypography;
  pagePadding: string;
  showPhoto?: boolean;
  itemTitleLayout: ItemTitleLayout;
  measureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const groups: { section: Section | null; blockIndices: number[] }[] = [];
  let current: { section: Section | null; blockIndices: number[] } | null = null;

  blocks.forEach((block, index) => {
    if (block.kind === "header") {
      if (current) groups.push(current);
      groups.push({ section: null, blockIndices: [index] });
      current = null;
      return;
    }

    if (block.kind === "section-title") {
      if (current) groups.push(current);
      current = { section: block.section, blockIndices: [index] };
      return;
    }

    if (!current) {
      current = { section: block.section, blockIndices: [index] };
    } else {
      current.blockIndices.push(index);
    }
  });
  if (current) groups.push(current);

  return (
    <div
      ref={measureRef}
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 opacity-0"
    >
      <div
        className="box-border"
        style={{ width: page.width, padding: pagePadding, fontSize: `${typography.bodyPx}px` }}
        data-cv-measure-root
      >
        {groups.map((group, groupIndex) => {
          if (group.section === null) {
            const block = blocks[group.blockIndices[0]];
            return (
              <div key={`m-header-${groupIndex}`} data-cv-block-index={group.blockIndices[0]}>
                {block.kind === "header" ? (
                  <CvPreviewHeader
                    contactProfile={block.contactProfile}
                    showPhoto={showPhoto}
                    typography={typography}
                  />
                ) : null}
              </div>
            );
          }

          const titleIndex = group.blockIndices.find(
            (i) => blocks[i].kind === "section-title"
          );
          const itemIndices = group.blockIndices.filter(
            (i) => blocks[i].kind === "item"
          );

          return (
            <section
              key={`m-section-${group.section.id}-${groupIndex}`}
              className={groupIndex > 0 ? "mt-5" : undefined}
            >
              {titleIndex != null ? (
                <div data-cv-block-index={titleIndex}>
                  <CvPreviewSectionTitle section={group.section} typography={typography} />
                </div>
              ) : null}
              <div className="space-y-3">
                {itemIndices.map((blockIndex) => {
                  const block = blocks[blockIndex];
                  return (
                    <div key={blockIndex} data-cv-block-index={blockIndex}>
                      {block.kind === "item" ? (
                        <CvPreviewItem
                          item={block.item}
                          itemTitleLayout={itemTitleLayout}
                          typography={typography}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function CvPreview({
  content,
  className,
  singlePage = false,
  pageGapClassName = "gap-6",
}: CvPreviewProps) {
  const { contactProfile, sections } = content;
  const pageFormat = content.settings.pageFormat ?? "A4";
  const page = getPageFormatSpec(pageFormat);
  const margins = getPageMargins(content.settings);
  const pagePadding = getPagePaddingStyle(margins);
  const typography = useMemo(() => resolveCvTypography(content.settings), [content.settings]);
  const showPhoto = content.settings.showPhoto;
  const itemTitleLayout = content.settings.itemTitleLayout ?? "STACKED";
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageIndices, setPageIndices] = useState<number[][] | null>(null);

  const blocks = useMemo(
    () => buildCvBlocks(contactProfile, sections),
    [contactProfile, sections]
  );

  const typographyKey = JSON.stringify(typography);

  useLayoutEffect(() => {
    const root = measureRef.current?.querySelector<HTMLElement>("[data-cv-measure-root]");
    if (!root || blocks.length === 0) {
      setPageIndices([[]]);
      return;
    }

    const metrics = measureCvBlocks(root);
    const maxHeight = getUsablePageHeightPx(pageFormat, margins.vertical);
    setPageIndices(paginateCvBlocks(metrics, maxHeight));
  }, [blocks, pageFormat, typographyKey, showPhoto, itemTitleLayout, margins.horizontal, margins.vertical]);

  const pages = useMemo(() => {
    const fallback = [blocks.map((_, i) => i)];
    const isValidPagination =
      pageIndices != null &&
      pageIndices.some((page) => page.length > 0) &&
      pageIndices.every((page) =>
        page.every((index) => index >= 0 && index < blocks.length)
      );
    const indices = isValidPagination ? pageIndices : fallback;
    const resolved = singlePage ? [indices[0] ?? []] : indices;
    return resolved.map((indicesOnPage, pageIndex) =>
      resolvePageBlocks(
        indicesOnPage,
        blocks,
        pageIndex > 0 ? (resolved[pageIndex - 1]?.at(-1) ?? null) : null
      )
    );
  }, [pageIndices, blocks, singlePage]);

  const articleClassName = cn(
    "rounded-sm bg-white text-zinc-900 shadow-lg ring-1 ring-black/5 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/10",
    "box-border shrink-0",
    className
  );

  if (blocks.length === 0) {
    return (
      <div className="mx-auto w-fit">
        <article
          className={articleClassName}
          style={{
            width: page.width,
            minHeight: page.minHeight,
            padding: pagePadding,
            fontSize: `${typography.bodyPx}px`,
          }}
        />
      </div>
    );
  }

  const isPaginated = !singlePage && pages.length > 1;

  return (
    <div className="mx-auto w-fit">
      <CvPreviewMeasureLayout
        blocks={blocks}
        page={page}
        typography={typography}
        pagePadding={pagePadding}
        showPhoto={showPhoto}
        itemTitleLayout={itemTitleLayout}
        measureRef={measureRef}
      />

      <div className={cn("flex flex-col", isPaginated && pageGapClassName)}>
        {pages.map((pageBlocks, pageIndex) => (
          <CvPreviewPage
            key={pageIndex}
            pageBlocks={pageBlocks}
            page={page}
            typography={typography}
            pagePadding={pagePadding}
            showPhoto={showPhoto}
            itemTitleLayout={itemTitleLayout}
            className={className}
            fixedHeight={isPaginated || singlePage}
          />
        ))}
      </div>
    </div>
  );
}
