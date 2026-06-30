import type { DateFormat } from "@/lib/types/cv";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function isPresent(value: string): boolean {
  return /^present$/i.test(value.trim());
}

function parseDateParts(value: string): { year: number; month?: number; day?: number } | null {
  const trimmed = value.trim();
  if (!trimmed || isPresent(trimmed)) return null;

  const iso = trimmed.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = iso[2] ? Number(iso[2]) : undefined;
    const day = iso[3] ? Number(iso[3]) : undefined;
    if (Number.isFinite(year)) {
      return { year, month, day };
    }
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return { year: Number(yearOnly[1]) };
  }

  const monYear = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monYear) {
    const monthIndex = MONTHS_SHORT.findIndex(
      (m) => m.toLowerCase() === monYear[1].slice(0, 3).toLowerCase()
    );
    if (monthIndex >= 0) {
      return { year: Number(monYear[2]), month: monthIndex + 1 };
    }
  }

  return null;
}

export function formatSingleDate(
  value: string | undefined,
  format: DateFormat
): string | null {
  if (!value?.trim()) return null;
  if (isPresent(value)) return "Present";

  const parts = parseDateParts(value);
  if (!parts) return value.trim();

  switch (format) {
    case "YYYY":
      return String(parts.year);
    case "ISO": {
      if (parts.month != null && parts.day != null) {
        return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      }
      if (parts.month != null) {
        return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
      }
      return String(parts.year);
    }
    case "MM_YYYY": {
      if (parts.month != null) {
        return `${String(parts.month).padStart(2, "0")}/${parts.year}`;
      }
      return String(parts.year);
    }
    case "MON_YYYY":
    default: {
      if (parts.month != null) {
        return `${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
      }
      return String(parts.year);
    }
  }
}

export function formatDateRange(
  metadata: { startDate?: string; endDate?: string },
  format: DateFormat = "MON_YYYY"
): string | null {
  const start = formatSingleDate(metadata.startDate, format);
  const end = formatSingleDate(metadata.endDate, format);

  if (!start && !end) return null;
  if (!start && end) return end;
  if (!end) return `${start} – Present`;
  return `${start} – ${end}`;
}
