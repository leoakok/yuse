import type { ContactProfile, PageFormat, ResumeWithContent, SectionItem } from "@/lib/types/cv";
import { buildCvBlocks, shouldShowSectionTitleForItem, type CvBlock } from "@/lib/cv/cv-pagination";
import {
  formatItemHeadline,
  getSectionItemSubtitle,
} from "@/lib/cv/section-item-display";
import { getPageMargins, getPageSizeMm } from "@/lib/cv/page-format";
import { stripMarkdown } from "@/lib/markdown/render";

const PT_TO_MM = 25.4 / 72;

type FontSizeSetting = ResumeWithContent["settings"]["fontSize"];

interface Typography {
  bodyPt: number;
  smallPt: number;
  namePt: number;
  sectionPt: number;
  lineHeight: number;
}

function getTypography(fontSize: FontSizeSetting): Typography {
  const bodyPx = fontSize === "S" ? 11 : fontSize === "L" ? 15 : 13;
  return {
    bodyPt: bodyPx * 0.75,
    smallPt: 9,
    namePt: 18,
    sectionPt: 9,
    lineHeight: 1.4,
  };
}

function lineHeightMm(pdf: import("jspdf").jsPDF, typo: Typography): number {
  return pdf.getFontSize() * typo.lineHeight * PT_TO_MM;
}

function formatDateRange(metadata: Record<string, string | undefined>): string | null {
  const start = metadata.startDate;
  const end = metadata.endDate;
  if (!start && !end) return null;
  if (!end) return `${start} – Present`;
  return `${start} – ${end}`;
}

function bodyToLines(body: string): string[] {
  const lines: string[] = [];
  const blocks = body.split(/\n{2,}/);

  for (const block of blocks) {
    const blockLines = block.split("\n").filter((line) => line.trim().length > 0);
    if (blockLines.length === 0) continue;

    const isBulletList = blockLines.every((line) => /^[-*]\s+/.test(line.trim()));
    const isNumberedList = blockLines.every((line) => /^\d+\.\s+/.test(line.trim()));

    if (isBulletList) {
      for (const line of blockLines) {
        lines.push(`• ${stripMarkdown(line.replace(/^[-*]\s+/, "").trim())}`);
      }
    } else if (isNumberedList) {
      blockLines.forEach((line, index) => {
        lines.push(
          `${index + 1}. ${stripMarkdown(line.replace(/^\d+\.\s+/, "").trim())}`
        );
      });
    } else {
      lines.push(stripMarkdown(blockLines.join(" ")));
    }
  }

  return lines;
}

/** Safe filename stem for `{title}.pdf`. */
export function sanitizePdfFilename(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return cleaned || "resume";
}

function shouldDrawSectionTitleBeforeItem(
  block: CvBlock & { kind: "item" },
  lastBlock: CvBlock | null,
  atPageTop: boolean
): boolean {
  if (!lastBlock) return true;

  const prevOnPage = atPageTop ? null : lastBlock;
  const prevGlobal = lastBlock;
  return shouldShowSectionTitleForItem(block, prevOnPage, prevGlobal);
}

class VectorPdfLayout {
  private readonly pageSizeMm: { width: number; height: number };
  private readonly contentWidth: number;

  private y: number;

  constructor(
    private pdf: import("jspdf").jsPDF,
    pageFormat: PageFormat,
    private marginH: number,
    private marginV: number,
    private typo: Typography
  ) {
    this.pageSizeMm = getPageSizeMm(pageFormat);
    this.contentWidth = this.pageSizeMm.width - marginH * 2;
    this.y = marginV;
  }

  atPageTop(): boolean {
    return this.y <= this.marginV + 0.1;
  }

  private maxY(): number {
    return this.pageSizeMm.height - this.marginV;
  }

  private newPage(): void {
    this.pdf.addPage(
      [this.pageSizeMm.width, this.pageSizeMm.height],
      "portrait"
    );
    this.y = this.marginV;
  }

  ensureSpace(neededMm: number): void {
    if (this.y + neededMm <= this.maxY()) return;
    this.newPage();
  }

  gap(mm: number): void {
    this.y += mm;
  }

  private drawWrappedLines(
    lines: string[],
    options?: { indentMm?: number; color?: [number, number, number] }
  ): void {
    const indent = options?.indentMm ?? 0;
    const lh = lineHeightMm(this.pdf, this.typo);

    if (options?.color) {
      this.pdf.setTextColor(...options.color);
    }

    for (const line of lines) {
      this.ensureSpace(lh);
      this.pdf.text(line, this.marginH + indent, this.y);
      this.y += lh;
    }

    this.pdf.setTextColor(0, 0, 0);
  }

  drawHeader(contact: ContactProfile): void {
    const nameGap = 1.5;
    const headlineGap = 2;
    const contactGap = 2.5;
    const borderGap = 4;

    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(this.typo.namePt);
    const nameLines = this.pdf.splitTextToSize(contact.fullName, this.contentWidth);

    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(this.typo.namePt);
    this.pdf.setTextColor(24, 24, 27);
    this.drawWrappedLines(nameLines);
    this.gap(nameGap);

    if (contact.headline) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.bodyPt);
      const headlineLines = this.pdf.splitTextToSize(contact.headline, this.contentWidth);
      this.drawWrappedLines(headlineLines, { color: [82, 82, 91] });
      this.gap(headlineGap);
    }

    const contactParts = [
      contact.email,
      contact.phone,
      contact.location,
      contact.website,
    ].filter(Boolean) as string[];

    if (contactParts.length > 0) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.smallPt);
      this.ensureSpace(lineHeightMm(this.pdf, this.typo));
      this.pdf.setTextColor(113, 113, 122);
      this.pdf.text(contactParts.join("   "), this.marginH, this.y);
      this.y += lineHeightMm(this.pdf, this.typo);
      this.gap(contactGap);
    }

    this.ensureSpace(0.5);
    this.pdf.setDrawColor(228, 228, 231);
    this.pdf.setLineWidth(0.2);
    this.pdf.line(this.marginH, this.y, this.marginH + this.contentWidth, this.y);
    this.y += borderGap;
    this.pdf.setTextColor(0, 0, 0);
  }

  drawSectionTitle(title: string): void {
    const titleGap = 2;
    const sectionGap = 5;
    const titleHeight = lineHeightMm(this.pdf, this.typo);

    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(this.typo.sectionPt);
    this.ensureSpace(titleHeight + titleGap + sectionGap);

    this.pdf.setTextColor(63, 63, 70);
    this.pdf.text(title.toUpperCase(), this.marginH, this.y);
    this.y += titleHeight + titleGap;

    this.pdf.setDrawColor(212, 212, 216);
    this.pdf.setLineWidth(0.15);
    this.pdf.line(this.marginH, this.y, this.marginH + this.contentWidth, this.y);
    this.y += sectionGap;
    this.pdf.setTextColor(0, 0, 0);
  }

  drawItem(item: SectionItem): void {
    const dates = formatDateRange(item.metadata);
    const subtitle = getSectionItemSubtitle(item);
    const headline = formatItemHeadline(item);
    const itemGap = 3.5;

    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(this.typo.bodyPt);

    let headlineWidth = this.contentWidth;
    if (dates) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.smallPt);
      const datesWidth = this.pdf.getTextWidth(dates) + 4;
      this.pdf.setFont("helvetica", "bold");
      this.pdf.setFontSize(this.typo.bodyPt);
      headlineWidth = Math.max(20, this.contentWidth - datesWidth);
    }

    const headlineLines = this.pdf.splitTextToSize(headline, headlineWidth);
    const headlineLh = lineHeightMm(this.pdf, this.typo);

    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(this.typo.bodyPt);
    this.pdf.setTextColor(24, 24, 27);

    if (dates && headlineLines.length === 1) {
      this.ensureSpace(headlineLh);
      this.pdf.text(headlineLines[0], this.marginH, this.y);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.smallPt);
      this.pdf.setTextColor(113, 113, 122);
      this.pdf.text(dates, this.marginH + this.contentWidth, this.y, { align: "right" });
      this.y += headlineLh;
    } else {
      this.drawWrappedLines(headlineLines);
      if (dates) {
        this.pdf.setFont("helvetica", "normal");
        this.pdf.setFontSize(this.typo.smallPt);
        this.pdf.setTextColor(113, 113, 122);
        this.ensureSpace(lineHeightMm(this.pdf, this.typo));
        this.pdf.text(dates, this.marginH + this.contentWidth, this.y, { align: "right" });
        this.y += lineHeightMm(this.pdf, this.typo);
      }
    }

    if (subtitle) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.smallPt);
      this.pdf.setTextColor(113, 113, 122);
      this.ensureSpace(lineHeightMm(this.pdf, this.typo));
      this.pdf.text(subtitle, this.marginH, this.y);
      this.y += lineHeightMm(this.pdf, this.typo) + 0.8;
    }

    if (item.type === "EXPERIENCE" && item.metadata.location) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.smallPt);
      this.pdf.setTextColor(113, 113, 122);
      this.ensureSpace(lineHeightMm(this.pdf, this.typo));
      this.pdf.text(item.metadata.location, this.marginH, this.y);
      this.y += lineHeightMm(this.pdf, this.typo) + 0.8;
    }

    if (item.body) {
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(this.typo.bodyPt);
      const bodyLines = bodyToLines(item.body).flatMap((paragraph) =>
        this.pdf.splitTextToSize(paragraph, this.contentWidth)
      );
      if (bodyLines.length > 0) {
        this.gap(1);
        this.drawWrappedLines(bodyLines, { color: [63, 63, 70] });
      }
    }

    this.gap(itemGap);
    this.pdf.setTextColor(0, 0, 0);
  }
}

export async function exportResumePdfVector(options: {
  content: ResumeWithContent;
  pageFormat?: PageFormat;
  filename: string;
}): Promise<void> {
  const { content, filename } = options;
  const pageFormat =
    options.pageFormat ?? content.settings.pageFormat ?? "A4";
  const typo = getTypography(content.settings.fontSize ?? "M");

  const { jsPDF } = await import("jspdf");
  const pageSizeMm = getPageSizeMm(pageFormat);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageSizeMm.width, pageSizeMm.height],
  });

  const margins = getPageMargins(content.settings);
  const layout = new VectorPdfLayout(
    pdf,
    pageFormat,
    margins.horizontal,
    margins.vertical,
    typo
  );
  const blocks = buildCvBlocks(content.contactProfile, content.sections);
  let lastBlock: CvBlock | null = null;

  for (const block of blocks) {
    if (block.kind === "item") {
      if (
        lastBlock?.kind === "section-title" &&
        lastBlock.section.id === block.section.id &&
        !layout.atPageTop()
      ) {
        layout.ensureSpace(lineHeightMm(pdf, typo) * 3);
      }

      const needsTitle = shouldDrawSectionTitleBeforeItem(
        block,
        lastBlock,
        layout.atPageTop()
      );
      if (needsTitle) {
        if (lastBlock?.kind === "item" && lastBlock.section.id !== block.section.id) {
          layout.gap(5);
        }
        layout.drawSectionTitle(block.section.title);
      }
      layout.drawItem(block.item);
    } else if (block.kind === "section-title") {
      if (lastBlock?.kind === "item") {
        layout.gap(5);
      }
      layout.drawSectionTitle(block.section.title);
    } else if (block.kind === "header") {
      layout.drawHeader(block.contactProfile);
    }

    lastBlock = block;
  }

  pdf.save(`${sanitizePdfFilename(filename)}.pdf`);
}
