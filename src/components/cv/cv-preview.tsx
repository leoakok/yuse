"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type {
  ColumnLayout,
  ContactField,
  ContactLayout,
  ContactProfile,
  DateFormat,
  DatePosition,
  ItemTitleLayout,
  ItemTitleOrder,
  ItemTitleSeparator,
  PhotoPosition,
  PhotoSize,
  ResumeWithContent,
  Section,
  SectionDividerStyle,
  SectionItem,
  SidebarPosition,
  SidebarWidth,
  SkillsLayout,
} from "@/lib/types/cv";
import {
  isSidebarSection,
  isTwoColumnLayout,
  resolveSidebarWidthPercent,
  sidebarFlexDirection,
} from "@/lib/cv/column-layout";
import { ATS_SYSTEM_FONT_STYLE, resolveAtsPreviewSettings } from "@/lib/cv/ats-preview";
import { resolveAccentColor } from "@/lib/cv/accent";
import { normalizeContactFields } from "@/lib/cv/contact-header";
import { formatDateRange } from "@/lib/cv/dates";
import { getCvFontFamilyClassName, getCvBodyFontClassName, getCvHeadingFontClassName, cvFontVariableClassNames } from "@/lib/cv/fonts";
import { DEFAULT_PHOTO_POSITION, DEFAULT_PHOTO_SIZE } from "@/lib/cv/photo";
import {
  CvPreviewHeader,
  CvPreviewSidebarPhoto,
} from "@/components/cv/cv-preview-header";
import {
  buildCvBlocks,
  measureCvBlocks,
  paginateCvBlocks,
  pageIndicesEqual,
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
  getInlineItemLineParts,
  getInlineItemTitleFields,
  getSectionItemSubtitle,
} from "@/lib/cv/section-item-display";
import { resolveCvTypography, type CvTypography } from "@/lib/cv/typography";
import { resolveCvDesignTokens, sectionDisplayTitle, isCurrentRole, type CvDesignTokens } from "@/lib/cv/resume-design";
import { formatLevelLabel } from "@/lib/cv/levels";
import { LANGUAGE_LEVELS, SKILL_LEVELS } from "@/lib/cv/levels";
import { cn } from "@/lib/utils";

interface CvPreviewProps {
  content: ResumeWithContent;
  className?: string;
  /** When true, only the first page is shown (e.g. grid thumbnails). */
  singlePage?: boolean;
  /** Gap between stacked pages in the live preview. */
  pageGapClassName?: string;
  /** When false, contact links render as static text (e.g. grid thumbnails inside a Link). */
  interactive?: boolean;
}

function proficiencyFillCount(level: string | undefined, max: number): number {
  if (!level?.trim()) return 0;
  const key = level.trim().toUpperCase();
  const idx = max === 5 ? SKILL_LEVELS.indexOf(key as (typeof SKILL_LEVELS)[number]) : LANGUAGE_LEVELS.indexOf(key as (typeof LANGUAGE_LEVELS)[number]);
  return idx >= 0 ? idx + 1 : 0;
}

function ProficiencyIndicator({
  level,
  mode,
  accentColor,
  textMuted,
}: {
  level: string | undefined;
  mode: CvDesignTokens["skillsProficiency"];
  accentColor: string;
  textMuted: string;
}) {
  const label = formatLevelLabel(level);
  if (mode === "NONE" || !label) return null;

  if (mode === "TEXT") {
    return (
      <span className="text-xs" style={{ color: textMuted }}>
        {label}
      </span>
    );
  }

  const filled = proficiencyFillCount(level, 5);
  const total = 5;

  if (mode === "BARS") {
    return (
      <span className="inline-flex h-1.5 w-16 overflow-hidden rounded-sm bg-zinc-200">
        <span
          className="h-full rounded-sm"
          style={{ width: `${(filled / total) * 100}%`, backgroundColor: accentColor }}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex gap-0.5" aria-label={label ?? undefined}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className="size-1.5 rounded-full"
          style={{
            backgroundColor: index < filled ? accentColor : "#d4d4d8",
          }}
        />
      ))}
    </span>
  );
}

function CvPreviewSectionTitle({
  section,
  displayTitle,
  typography,
  accentColor,
  sectionDividerStyle,
  designTokens,
}: {
  section: Section;
  displayTitle?: string | null;
  typography: CvTypography;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  designTokens: CvDesignTokens;
}) {
  const title = sectionDisplayTitle(section, displayTitle);
  const borderStyle =
    sectionDividerStyle === "NONE"
      ? undefined
      : sectionDividerStyle === "TEXT_WIDTH"
        ? { borderBottom: `2px solid ${accentColor}`, display: "inline-block" as const }
        : { borderBottom: `2px solid ${accentColor}` };

  return (
    <h2
      className={cn(
        "mb-2",
        sectionDividerStyle === "FULL" && "border-b pb-0.5",
        designTokens.sectionTitleCase === "UPPERCASE" && "uppercase tracking-wider",
        designTokens.sectionTitleCase === "CAPITALIZE" && "capitalize"
      )}
      style={{
        fontSize: `${typography.sectionTitlePx}px`,
        fontWeight: designTokens.sectionTitleFontWeight,
        letterSpacing: designTokens.headingLetterSpacing,
        color: designTokens.textPrimary,
        ...(sectionDividerStyle === "FULL" ? borderStyle : {}),
        ...(sectionDividerStyle === "TEXT_WIDTH" ? borderStyle : {}),
      }}
    >
      {title}
    </h2>
  );
}

function CvPreviewSkills({
  items,
  layout,
  typography,
  designTokens,
}: {
  items: SectionItem[];
  layout: SkillsLayout;
  typography: CvTypography;
  designTokens: CvDesignTokens;
}) {
  const bodyStyle = {
    fontSize: `${typography.bodyPx}px`,
    color: designTokens.textPrimary,
  };
  const showProficiency = designTokens.skillsProficiency !== "NONE";

  if (layout === "TAGS") {
    return (
      <div className="flex flex-wrap gap-1.5" style={bodyStyle}>
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5"
            style={{ borderColor: designTokens.textMuted, color: designTokens.textPrimary }}
          >
            {item.headline}
            {showProficiency ? (
              <ProficiencyIndicator
                level={item.metadata.level}
                mode={designTokens.skillsProficiency}
                accentColor={designTokens.accentColor}
                textMuted={designTokens.textMuted}
              />
            ) : null}
          </span>
        ))}
      </div>
    );
  }

  if (layout === "COLUMNS") {
    return (
      <ul className="columns-2 gap-x-6" style={bodyStyle}>
        {items.map((item) => (
          <li key={item.id} className="break-inside-avoid">
            <span className="inline-flex items-center gap-2">
              {item.headline}
              {showProficiency ? (
                <ProficiencyIndicator
                  level={item.metadata.level}
                  mode={designTokens.skillsProficiency}
                  accentColor={designTokens.accentColor}
                  textMuted={designTokens.textMuted}
                />
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="list-disc space-y-0.5 pl-5" style={bodyStyle}>
      {items.map((item) => (
        <li key={item.id}>
          <span className="inline-flex flex-wrap items-center gap-2">
            {item.headline}
            {showProficiency ? (
              <ProficiencyIndicator
                level={item.metadata.level}
                mode={designTokens.skillsProficiency}
                accentColor={designTokens.accentColor}
                textMuted={designTokens.textMuted}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CvPreviewLanguages({
  items,
  layout,
  typography,
  designTokens,
}: {
  items: SectionItem[];
  layout: CvDesignTokens["languagesLayout"];
  typography: CvTypography;
  designTokens: CvDesignTokens;
}) {
  const bodyStyle = {
    fontSize: `${typography.bodyPx}px`,
    color: designTokens.textPrimary,
  };

  if (layout === "INLINE") {
    return (
      <p style={bodyStyle}>
        {items.map((item, index) => {
          const level = formatLevelLabel(item.metadata.level);
          return (
            <span key={item.id}>
              {index > 0 ? ", " : null}
              {item.headline}
              {level ? ` (${level})` : null}
            </span>
          );
        })}
      </p>
    );
  }

  if (layout === "COLUMNS") {
    return (
      <ul className="columns-2 gap-x-6" style={bodyStyle}>
        {items.map((item) => {
          const level = formatLevelLabel(item.metadata.level);
          return (
            <li key={item.id} className="break-inside-avoid">
              {item.headline}
              {level ? `, ${level}` : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return null;
}

function CvPreviewCertifications({
  items,
  layout,
  typography,
  designTokens,
}: {
  items: SectionItem[];
  layout: CvDesignTokens["certificationsLayout"];
  typography: CvTypography;
  designTokens: CvDesignTokens;
}) {
  const bodyStyle = {
    fontSize: `${typography.bodyPx}px`,
    color: designTokens.textPrimary,
  };
  const metaStyle = { fontSize: `${typography.itemMetaPx}px`, color: designTokens.textMuted };

  if (layout === "COMPACT") {
    return (
      <p style={bodyStyle}>
        {items.map((item, index) => (
          <span key={item.id}>
            {index > 0 ? " · " : null}
            {item.headline}
          </span>
        ))}
      </p>
    );
  }

  return null;
}

function CvPreviewItem({
  item,
  itemTitleLayout,
  itemTitleSeparator,
  itemTitleOrder,
  dateFormat,
  datePosition,
  typography,
  designTokens,
}: {
  item: SectionItem;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  typography: CvTypography;
  designTokens: CvDesignTokens;
}) {
  const dates = formatDateRange(item.metadata, dateFormat);
  const subtitle = getSectionItemSubtitle(item);
  const headline = formatItemHeadline(item);
  const inlineFields =
    itemTitleLayout === "INLINE" ? getInlineItemTitleFields(item, itemTitleOrder) : null;
  const inlineLineParts = inlineFields
    ? getInlineItemLineParts({
        left: inlineFields.left,
        right: inlineFields.right,
        separator: itemTitleSeparator,
      })
    : null;
  const metaStyle = { fontSize: `${typography.itemMetaPx}px`, color: designTokens.textMuted };
  const titlePx = { fontSize: `${typography.itemTitlePx}px` };
  const emphasizeCompany = designTokens.itemTitleEmphasis === "COMPANY";
  const location = item.metadata.location?.trim();
  const showLocationOwnLine =
    designTokens.locationDisplay === "OWN_LINE" && location && item.type === "EXPERIENCE";
  const showLocationInline =
    designTokens.locationDisplay === "INLINE_WITH_COMPANY" && location && item.type === "EXPERIENCE";
  const highlight =
    designTokens.highlightCurrentRole &&
    item.type === "EXPERIENCE" &&
    isCurrentRole(item.metadata);

  const datesNode = dates ? (
    <span className="shrink-0" style={metaStyle}>
      {dates}
    </span>
  ) : null;

  const subtitleWithLocation =
    subtitle && showLocationInline ? `${subtitle} · ${location}` : subtitle;

  const titleBlock = inlineLineParts ? (
    <h3 style={titlePx}>
      <span style={{ fontWeight: emphasizeCompany ? 400 : 600 }}>{inlineLineParts.primary}</span>
      {datePosition === "INLINE" && dates ? (
        <span style={metaStyle}> · {dates}</span>
      ) : null}
      <span style={{ fontWeight: emphasizeCompany ? 600 : 400, ...metaStyle }}>
        {inlineLineParts.secondary}
      </span>
    </h3>
  ) : (
    <h3 style={titlePx}>
      <span style={{ fontWeight: emphasizeCompany ? 400 : 600 }} className="inline-flex flex-wrap items-center gap-2">
        {item.type === "SKILLS" || item.type === "LANGUAGES"
          ? item.headline
          : headline}
        {item.type === "SKILLS" && designTokens.skillsProficiency !== "NONE" ? (
          <ProficiencyIndicator
            level={item.metadata.level}
            mode={designTokens.skillsProficiency}
            accentColor={designTokens.accentColor}
            textMuted={designTokens.textMuted}
          />
        ) : null}
      </span>
      {datePosition === "INLINE" && dates ? (
        <span style={metaStyle}> · {dates}</span>
      ) : null}
    </h3>
  );

  const subtitleBlock =
    !inlineFields && subtitleWithLocation ? (
      <p style={{ ...metaStyle, fontWeight: emphasizeCompany ? 600 : 400 }}>{subtitleWithLocation}</p>
    ) : null;

  const locationBlock = showLocationOwnLine ? <p style={metaStyle}>{location}</p> : null;

  const bodyBlock = item.body ? (
    <div style={{ fontSize: `${typography.bodyPx}px`, color: designTokens.textPrimary }}>
      <MarkdownContent
        content={item.body}
        className="mt-1"
        descriptionStyle={designTokens.descriptionStyle}
        bulletMarker={
          designTokens.descriptionStyle === "BULLETS" ? designTokens.bulletMarker : undefined
        }
      />
    </div>
  ) : null;

  const itemShell = (children: ReactNode) => (
    <div
      className={cn(highlight && "rounded-sm border-l-2 pl-2")}
      style={
        highlight
          ? {
              borderLeftColor: designTokens.accentColor,
              backgroundColor: `${designTokens.accentColor}14`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );

  if (datePosition === "BELOW") {
    return itemShell(
      <>
        {titleBlock}
        {subtitleBlock}
        {dates ? <p style={metaStyle}>{dates}</p> : null}
        {locationBlock}
        {bodyBlock}
      </>
    );
  }

  return itemShell(
    <>
      <div
        className={cn(
          datePosition === "RIGHT"
            ? "flex items-baseline justify-between gap-2"
            : "space-y-0.5"
        )}
      >
        <div className="min-w-0">{titleBlock}</div>
        {datePosition === "RIGHT" ? datesNode : null}
      </div>
      {subtitleBlock}
      {locationBlock}
      {bodyBlock}
    </>
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

type SectionGroup = { section: Section | null; blocks: CvBlock[] };

interface CvSectionRenderProps {
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  skillsLayout: SkillsLayout;
  typography: CvTypography;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  designTokens: CvDesignTokens;
}

function renderSectionGroup(
  group: SectionGroup,
  index: number,
  props: CvSectionRenderProps,
  options?: {
    /** When set, blocks are wrapped with data-cv-block-index for pagination measurement. */
    blockIndexFor?: (block: CvBlock) => number | undefined;
    itemIndexInSection?: number;
  }
) {
  if (group.section === null) return null;

  const titleBlock = group.blocks.find((b) => b.kind === "section-title");
  const displayTitle =
    titleBlock?.kind === "section-title" ? titleBlock.displayTitle : undefined;
  const contentBlocks = group.blocks.filter(
    (b) =>
      b.kind === "item" ||
      b.kind === "skills" ||
      b.kind === "languages" ||
      b.kind === "certifications"
  );

  let itemCounter = 0;

  return (
    <section
      key={`${group.section.id}-${index}`}
      className={cn(props.designTokens.keepSectionsTogether && "break-inside-avoid")}
      style={{ marginTop: index > 0 ? props.designTokens.sectionGapPx : undefined }}
    >
      {titleBlock ? (() => {
        const titleBlockIndex = options?.blockIndexFor?.(titleBlock);
        const title = (
          <CvPreviewSectionTitle
            section={titleBlock.section}
            displayTitle={displayTitle}
            typography={props.typography}
            accentColor={props.accentColor}
            sectionDividerStyle={props.sectionDividerStyle}
            designTokens={props.designTokens}
          />
        );
        return titleBlockIndex != null ? (
          <div data-cv-block-index={titleBlockIndex}>{title}</div>
        ) : (
          title
        );
      })() : null}
      <div style={{ display: "flex", flexDirection: "column", gap: props.designTokens.itemGapPx }}>
        {contentBlocks.map((block, blockIdx) => {
          const blockIndex = options?.blockIndexFor?.(block);
          const currentItemIndex = itemCounter;
          if (block.kind === "item") itemCounter += 1;

          const breakBefore =
            props.designTokens.maxItemsBeforeBreak != null &&
            props.designTokens.maxItemsBeforeBreak > 0 &&
            block.kind === "item" &&
            currentItemIndex > 0 &&
            currentItemIndex % props.designTokens.maxItemsBeforeBreak === 0;

          const content =
            block.kind === "skills" ? (
              <CvPreviewSkills
                items={block.items}
                layout={props.skillsLayout}
                typography={props.typography}
                designTokens={props.designTokens}
              />
            ) : block.kind === "languages" ? (
              <CvPreviewLanguages
                items={block.items}
                layout={block.layout}
                typography={props.typography}
                designTokens={props.designTokens}
              />
            ) : block.kind === "certifications" ? (
              <CvPreviewCertifications
                items={block.items}
                layout={block.layout}
                typography={props.typography}
                designTokens={props.designTokens}
              />
            ) : block.kind === "item" ? (
              <CvPreviewItem
                item={block.item}
                itemTitleLayout={props.itemTitleLayout}
                itemTitleSeparator={props.itemTitleSeparator}
                itemTitleOrder={props.itemTitleOrder}
                dateFormat={props.dateFormat}
                datePosition={props.datePosition}
                typography={props.typography}
                designTokens={props.designTokens}
              />
            ) : null;

          const wrapped = (
            <div
              className={cn(breakBefore && "break-before-page")}
              style={breakBefore ? { breakBefore: "page" } : undefined}
            >
              {content}
            </div>
          );

          if (blockIndex != null) {
            return (
              <div key={blockIdx} data-cv-block-index={blockIndex}>
                {wrapped}
              </div>
            );
          }
          return <div key={blockIdx}>{wrapped}</div>;
        })}
      </div>
    </section>
  );
}

function splitGroupsForColumns(groups: SectionGroup[]) {
  const headerGroups = groups.filter((g) => g.section === null);
  const bodyGroups = groups.filter((g) => g.section !== null);
  const sidebarGroups = bodyGroups.filter(
    (g) => g.section && isSidebarSection(g.section.type)
  );
  const mainGroups = bodyGroups.filter(
    (g) => g.section && !isSidebarSection(g.section.type)
  );
  return { headerGroups, sidebarGroups, mainGroups, bodyGroups };
}

function CvPreviewPage({
  pageBlocks,
  page,
  typography,
  pagePadding,
  showPhoto,
  photoPosition,
  photoSize,
  contactLayout,
  contactFields,
  columnLayout,
  sidebarPosition,
  sidebarWidth,
  itemTitleLayout,
  itemTitleSeparator,
  itemTitleOrder,
  dateFormat,
  datePosition,
  skillsLayout,
  accentColor,
  sectionDividerStyle,
  fontFamilyClassName,
  headingFontClassName,
  bodyFontClassName,
  atsMode,
  designTokens,
  contactName,
  pageNumber,
  totalPages,
  className,
  fixedHeight,
  interactive = true,
}: {
  pageBlocks: CvBlock[];
  page: ReturnType<typeof getPageFormatSpec>;
  typography: CvTypography;
  pagePadding: string;
  showPhoto?: boolean;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  contactLayout: ContactLayout;
  contactFields: ContactField[];
  columnLayout: ColumnLayout;
  sidebarPosition: SidebarPosition;
  sidebarWidth: SidebarWidth;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  skillsLayout: SkillsLayout;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  fontFamilyClassName: string;
  headingFontClassName: string;
  bodyFontClassName: string;
  atsMode: boolean;
  designTokens: CvDesignTokens;
  contactName?: string;
  pageNumber: number;
  totalPages: number;
  className?: string;
  fixedHeight?: boolean;
  interactive?: boolean;
}) {
  const groups = groupPageBlocks(pageBlocks);
  const { headerGroups, sidebarGroups, mainGroups, bodyGroups } = splitGroupsForColumns(groups);
  const twoColumn = isTwoColumnLayout(columnLayout) && !atsMode;
  const headerBlock = headerGroups[0]?.blocks[0];
  const contactProfile =
    headerBlock?.kind === "header" ? headerBlock.contactProfile : undefined;
  const sectionProps: CvSectionRenderProps = {
    itemTitleLayout,
    itemTitleSeparator,
    itemTitleOrder,
    dateFormat,
    datePosition,
    skillsLayout,
    typography,
    accentColor,
    sectionDividerStyle,
    designTokens,
  };
  const sidebarWidthPercent = resolveSidebarWidthPercent(sidebarWidth);
  const footerText =
    designTokens.footerStyle === "PAGE_NUMBER"
      ? `${pageNumber} / ${totalPages}`
      : designTokens.footerStyle === "NAME_AND_PAGE"
        ? `${contactName ?? ""}${contactName ? " · " : ""}${pageNumber} / ${totalPages}`
        : null;

  return (
    <article
      className={cn(
        cvFontVariableClassNames,
        bodyFontClassName,
        fontFamilyClassName,
        "cv-print-page rounded-sm shadow-lg ring-1 ring-black/5 dark:ring-white/10",
        "box-border shrink-0 overflow-hidden",
        className
      )}
        style={{
        width: page.width,
        padding: pagePadding,
        fontSize: `${typography.bodyPx}px`,
        lineHeight: designTokens.lineHeight,
        backgroundColor: designTokens.pageBackground,
        color: designTokens.textPrimary,
        ...(atsMode ? ATS_SYSTEM_FONT_STYLE : {}),
        ...(fixedHeight
          ? { height: page.minHeight, minHeight: page.minHeight }
          : { minHeight: page.minHeight }),
      }}
    >
      {headerGroups.map((group, index) => {
        const block = group.blocks[0];
        return (
          <div key={`header-${index}`}>
            {block?.kind === "header" ? (
              <CvPreviewHeader
                contactProfile={block.contactProfile}
                showPhoto={showPhoto}
                photoPosition={photoPosition}
                photoSize={photoSize}
                contactLayout={contactLayout}
                contactFields={contactFields}
                columnLayout={columnLayout}
                typography={typography}
                accentColor={designTokens.linkColor}
                nameFontWeight={designTokens.nameFontWeight}
                headingFontClassName={headingFontClassName}
                textMuted={designTokens.textMuted}
                interactive={interactive}
              />
            ) : null}
          </div>
        );
      })}

      {twoColumn ? (
        <div
          className="flex gap-4"
          style={{ flexDirection: sidebarFlexDirection(sidebarPosition) }}
        >
          <aside className="shrink-0" style={{ width: `${sidebarWidthPercent}%` }}>
            {contactProfile ? (
              <CvPreviewSidebarPhoto
                contactProfile={contactProfile}
                showPhoto={showPhoto ?? false}
                photoPosition={photoPosition}
                photoSize={photoSize}
                columnLayout={columnLayout}
                accentColor={accentColor}
              />
            ) : null}
            {sidebarGroups.map((group, index) =>
              renderSectionGroup(group, index, sectionProps)
            )}
          </aside>
          <main className="min-w-0 flex-1">
            {mainGroups.map((group, index) =>
              renderSectionGroup(group, index, sectionProps)
            )}
          </main>
        </div>
      ) : (
        bodyGroups.map((group, index) =>
          renderSectionGroup(group, index, sectionProps)
        )
      )}
      {footerText ? (
        <footer
          className="cv-print-footer mt-4 text-center text-[9pt] print:fixed print:bottom-0"
          style={{ color: designTokens.textMuted }}
        >
          {footerText}
        </footer>
      ) : null}
    </article>
  );
}

function CvPreviewMeasureLayout({
  blocks,
  page,
  typography,
  pagePadding,
  showPhoto,
  photoPosition,
  photoSize,
  contactLayout,
  contactFields,
  columnLayout,
  sidebarPosition,
  sidebarWidth,
  atsMode,
  itemTitleLayout,
  itemTitleSeparator,
  itemTitleOrder,
  dateFormat,
  datePosition,
  skillsLayout,
  accentColor,
  sectionDividerStyle,
  designTokens,
  headingFontClassName,
  bodyFontClassName,
  measureRef,
  interactive = true,
}: {
  blocks: CvBlock[];
  page: ReturnType<typeof getPageFormatSpec>;
  typography: CvTypography;
  pagePadding: string;
  showPhoto?: boolean;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  contactLayout: ContactLayout;
  contactFields: ContactField[];
  columnLayout: ColumnLayout;
  sidebarPosition: SidebarPosition;
  sidebarWidth: SidebarWidth;
  atsMode: boolean;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  skillsLayout: SkillsLayout;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  designTokens: CvDesignTokens;
  headingFontClassName: string;
  bodyFontClassName: string;
  measureRef: RefObject<HTMLDivElement | null>;
  interactive?: boolean;
}) {
  const indexGroups: { section: Section | null; blockIndices: number[] }[] = [];
  let current: { section: Section | null; blockIndices: number[] } | null = null;

  blocks.forEach((block, index) => {
    if (block.kind === "header") {
      if (current) indexGroups.push(current);
      indexGroups.push({ section: null, blockIndices: [index] });
      current = null;
      return;
    }

    if (block.kind === "section-title") {
      if (current) indexGroups.push(current);
      current = { section: block.section, blockIndices: [index] };
      return;
    }

    if (!current) {
      current = { section: block.section, blockIndices: [index] };
    } else {
      current.blockIndices.push(index);
    }
  });
  if (current) indexGroups.push(current);

  const blockGroups: SectionGroup[] = indexGroups.map((group) => ({
    section: group.section,
    blocks: group.blockIndices
      .map((index) => blocks[index])
      .filter((block): block is CvBlock => block != null),
  }));

  const blockIndexFor = (block: CvBlock) => blocks.indexOf(block);
  const { headerGroups, sidebarGroups, mainGroups, bodyGroups } =
    splitGroupsForColumns(blockGroups);
  const twoColumn = isTwoColumnLayout(columnLayout) && !atsMode;
  const headerBlock = headerGroups[0]?.blocks[0];
  const contactProfile =
    headerBlock?.kind === "header" ? headerBlock.contactProfile : undefined;
  const sectionProps: CvSectionRenderProps = {
    itemTitleLayout,
    itemTitleSeparator,
    itemTitleOrder,
    dateFormat,
    datePosition,
    skillsLayout,
    typography,
    accentColor,
    sectionDividerStyle,
    designTokens,
  };
  const sidebarWidthPercent = resolveSidebarWidthPercent(sidebarWidth);

  const renderMeasuredGroup = (group: SectionGroup, index: number) =>
    renderSectionGroup(group, index, sectionProps, { blockIndexFor });

  return (
    <div
      ref={measureRef}
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 opacity-0"
    >
      <div
        className={cn("box-border", bodyFontClassName)}
        style={{
          width: page.width,
          padding: pagePadding,
          fontSize: `${typography.bodyPx}px`,
          lineHeight: designTokens.lineHeight,
        }}
        data-cv-measure-root
      >
        {headerGroups.map((group, groupIndex) => {
          const block = group.blocks[0];
          const blockIndex = block ? blockIndexFor(block) : -1;
          return (
            <div
              key={`m-header-${groupIndex}`}
              {...(blockIndex >= 0 ? { "data-cv-block-index": blockIndex } : {})}
            >
              {block?.kind === "header" ? (
                <CvPreviewHeader
                  contactProfile={block.contactProfile}
                  showPhoto={showPhoto}
                  photoPosition={photoPosition}
                  photoSize={photoSize}
                  contactLayout={contactLayout}
                  contactFields={contactFields}
                  columnLayout={columnLayout}
                  typography={typography}
                  accentColor={designTokens.linkColor}
                  nameFontWeight={designTokens.nameFontWeight}
                  headingFontClassName={headingFontClassName}
                  textMuted={designTokens.textMuted}
                  interactive={interactive}
                />
              ) : null}
            </div>
          );
        })}

        {twoColumn ? (
          <div
            className="flex gap-4"
            style={{ flexDirection: sidebarFlexDirection(sidebarPosition) }}
          >
            <aside className="shrink-0" style={{ width: `${sidebarWidthPercent}%` }}>
              {contactProfile ? (
                <CvPreviewSidebarPhoto
                  contactProfile={contactProfile}
                  showPhoto={showPhoto ?? false}
                  photoPosition={photoPosition}
                  photoSize={photoSize}
                  columnLayout={columnLayout}
                  accentColor={accentColor}
                />
              ) : null}
              {sidebarGroups.map((group, index) => renderMeasuredGroup(group, index))}
            </aside>
            <main className="min-w-0 flex-1">
              {mainGroups.map((group, index) => renderMeasuredGroup(group, index))}
            </main>
          </div>
        ) : (
          bodyGroups.map((group, index) => renderMeasuredGroup(group, index))
        )}
      </div>
    </div>
  );
}

export function CvPreview({
  content,
  className,
  singlePage = false,
  pageGapClassName = "gap-6",
  interactive = true,
}: CvPreviewProps) {
  const { contactProfile, sections } = content;
  const previewSettings = useMemo(
    () => resolveAtsPreviewSettings(content.settings),
    [content.settings]
  );
  const pageFormat = previewSettings.pageFormat ?? "A4";
  const page = getPageFormatSpec(pageFormat);
  const margins = getPageMargins(previewSettings);
  const pagePadding = getPagePaddingStyle(margins);
  const typography = useMemo(() => resolveCvTypography(previewSettings), [previewSettings]);
  const showPhoto = previewSettings.showPhoto;
  const itemTitleLayout = previewSettings.itemTitleLayout ?? "STACKED";
  const itemTitleSeparator = previewSettings.itemTitleSeparator ?? "DOT";
  const itemTitleOrder = previewSettings.itemTitleOrder ?? "TITLE_FIRST";
  const dateFormat = previewSettings.dateFormat ?? "MON_YYYY";
  const datePosition = previewSettings.datePosition ?? "RIGHT";
  const skillsLayout = previewSettings.skillsLayout ?? "LIST";
  const columnLayout = previewSettings.columnLayout ?? "SINGLE";
  const sidebarPosition = previewSettings.sidebarPosition ?? "LEFT";
  const sidebarWidth = previewSettings.sidebarWidth ?? "MEDIUM";
  const photoPosition = previewSettings.photoPosition ?? DEFAULT_PHOTO_POSITION;
  const photoSize = previewSettings.photoSize ?? DEFAULT_PHOTO_SIZE;
  const contactLayout = previewSettings.contactLayout ?? "INLINE";
  const contactFieldsKey = useMemo(
    () => JSON.stringify(previewSettings.contactFields ?? []),
    [previewSettings.contactFields]
  );
  const contactFields = useMemo(
    () => normalizeContactFields(previewSettings.contactFields),
    [contactFieldsKey]
  );
  const atsMode = content.settings.atsMode ?? false;
  const designTokens = useMemo(
    () => resolveCvDesignTokens(content.settings),
    [content.settings]
  );
  const accentColor = atsMode ? "#000000" : resolveAccentColor(previewSettings.accentColor);
  const sectionDividerStyle = previewSettings.sectionDividerStyle ?? "FULL";
  const fontFamilyClassName = atsMode
    ? ""
    : getCvFontFamilyClassName(previewSettings.fontFamily);
  const headingFontClassName = atsMode
    ? ""
    : getCvHeadingFontClassName(designTokens.headingFontFamily);
  const bodyFontClassName = atsMode
    ? ""
    : getCvBodyFontClassName(designTokens.bodyFontFamily);
  const designTokensKey = JSON.stringify(designTokens);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageIndices, setPageIndices] = useState<number[][] | null>(null);

  const blocks = useMemo(
    () =>
      buildCvBlocks(contactProfile, sections, {
        skillsLayout,
        languagesLayout: designTokens.languagesLayout,
        certificationsLayout: designTokens.certificationsLayout,
      }),
    [contactProfile, sections, skillsLayout, designTokens.languagesLayout, designTokens.certificationsLayout]
  );

  const typographyKey = JSON.stringify(typography);

  useLayoutEffect(() => {
    const root = measureRef.current?.querySelector<HTMLElement>("[data-cv-measure-root]");
    if (!root || blocks.length === 0) {
      setPageIndices((prev) => (pageIndicesEqual(prev, [[]]) ? prev : [[]]));
      return;
    }

    const metrics = measureCvBlocks(root);
    const maxHeight = getUsablePageHeightPx(pageFormat, margins.vertical);
    const next = paginateCvBlocks(metrics, maxHeight);
    setPageIndices((prev) => (pageIndicesEqual(prev, next) ? prev : next));
  }, [
    blocks,
    pageFormat,
    typographyKey,
    showPhoto,
    itemTitleLayout,
    itemTitleSeparator,
    itemTitleOrder,
    dateFormat,
    datePosition,
    skillsLayout,
    columnLayout,
    sidebarPosition,
    sidebarWidth,
    photoPosition,
    photoSize,
    contactLayout,
    contactFieldsKey,
    sectionDividerStyle,
    margins.horizontal,
    margins.vertical,
    designTokensKey,
  ]);

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
        photoPosition={photoPosition}
        photoSize={photoSize}
        contactLayout={contactLayout}
        contactFields={contactFields}
        columnLayout={columnLayout}
        sidebarPosition={sidebarPosition}
        sidebarWidth={sidebarWidth}
        atsMode={atsMode}
        itemTitleLayout={itemTitleLayout}
        itemTitleSeparator={itemTitleSeparator}
        itemTitleOrder={itemTitleOrder}
        dateFormat={dateFormat}
        datePosition={datePosition}
        skillsLayout={skillsLayout}
        accentColor={accentColor}
        sectionDividerStyle={sectionDividerStyle}
        designTokens={designTokens}
        headingFontClassName={headingFontClassName}
        bodyFontClassName={bodyFontClassName}
        measureRef={measureRef}
        interactive={interactive}
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
            photoPosition={photoPosition}
            photoSize={photoSize}
            contactLayout={contactLayout}
            contactFields={contactFields}
            columnLayout={columnLayout}
            sidebarPosition={sidebarPosition}
            sidebarWidth={sidebarWidth}
            itemTitleLayout={itemTitleLayout}
            itemTitleSeparator={itemTitleSeparator}
            itemTitleOrder={itemTitleOrder}
            dateFormat={dateFormat}
            datePosition={datePosition}
            skillsLayout={skillsLayout}
            accentColor={accentColor}
            sectionDividerStyle={sectionDividerStyle}
            fontFamilyClassName={fontFamilyClassName}
            headingFontClassName={headingFontClassName}
            bodyFontClassName={bodyFontClassName}
            atsMode={atsMode}
            designTokens={designTokens}
            contactName={contactProfile?.fullName}
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
            className={className}
            fixedHeight={isPaginated || singlePage}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
}
