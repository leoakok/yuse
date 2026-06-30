import type { PageFormat, ResumeSettings } from "@/lib/types/cv";

export interface PageFormatSpec {
  id: PageFormat;
  label: string;
  description: string;
  width: string;
  minHeight: string;
}

export const PAGE_FORMATS: PageFormatSpec[] = [
  {
    id: "A4",
    label: "A4",
    description: "210 × 297 mm, common in Europe and internationally",
    width: "210mm",
    minHeight: "297mm",
  },
  {
    id: "LETTER",
    label: "US Letter",
    description: "8.5 × 11 in, standard in the United States",
    width: "8.5in",
    minHeight: "11in",
  },
];

export function getPageFormatSpec(format: PageFormat): PageFormatSpec {
  return PAGE_FORMATS.find((f) => f.id === format) ?? PAGE_FORMATS[0];
}

const PX_PER_IN = 96;
const MM_PER_IN = 25.4;

export const MARGIN_MIN_MM = 12;
export const MARGIN_MAX_MM = 25;

/** Every 1 mm from 12–25, typical resume margin range (~0.5–1 in). */
export function marginPresetValues(): number[] {
  return Array.from({ length: MARGIN_MAX_MM - MARGIN_MIN_MM + 1 }, (_, i) => i + MARGIN_MIN_MM);
}

export function snapMarginMm(mm: number): number {
  const rounded = Math.round(mm);
  return Math.max(MARGIN_MIN_MM, Math.min(MARGIN_MAX_MM, rounded));
}

export const DEFAULT_PAGE_MARGIN_MM = 12;

export interface PageMarginsMm {
  horizontal: number;
  vertical: number;
}

export function getPageMargins(settings?: Pick<ResumeSettings, "marginHorizontalMm" | "marginVerticalMm">): PageMarginsMm {
  return {
    horizontal: settings?.marginHorizontalMm ?? DEFAULT_PAGE_MARGIN_MM,
    vertical: settings?.marginVerticalMm ?? DEFAULT_PAGE_MARGIN_MM,
  };
}

export function getPagePaddingStyle(margins: PageMarginsMm): string {
  return `${margins.vertical}mm ${margins.horizontal}mm`;
}

function mmToPx(mm: number): number {
  return (mm * PX_PER_IN) / MM_PER_IN;
}

function inToPx(inches: number): number {
  return inches * PX_PER_IN;
}

function inToMm(inches: number): number {
  return inches * MM_PER_IN;
}

/** Page size in CSS pixels at 96dpi, matches article `width` / `height` styles. */
export function getPageSizePx(format: PageFormat): { width: number; height: number } {
  if (format === "LETTER") {
    return { width: inToPx(8.5), height: inToPx(11) };
  }
  return { width: mmToPx(210), height: mmToPx(297) };
}

/** Page size in millimeters for jsPDF. */
export function getPageSizeMm(format: PageFormat): { width: number; height: number } {
  if (format === "LETTER") {
    return { width: inToMm(8.5), height: inToMm(11) };
  }
  return { width: 210, height: 297 };
}

/** @deprecated Use getPageMargins, kept for legacy callers. */
export const PAGE_PADDING_MM = DEFAULT_PAGE_MARGIN_MM;

/** Content area height inside page margins, in CSS pixels. */
export function getUsablePageHeightPx(
  format: PageFormat,
  marginVerticalMm: number = DEFAULT_PAGE_MARGIN_MM
): number {
  const paddingPx = mmToPx(marginVerticalMm * 2);
  if (format === "LETTER") {
    return inToPx(11) - paddingPx;
  }
  return mmToPx(297) - paddingPx;
}
