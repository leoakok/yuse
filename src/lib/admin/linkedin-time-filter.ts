export const LINKEDIN_TIME_PRESETS = [
  { value: "r900", label: "Last 15m" },
  { value: "r3600", label: "Last 1h" },
  { value: "r86400", label: "Last 24h" },
  { value: "r604800", label: "Last week" },
  { value: "r2592000", label: "Last month" },
] as const;

const MAX_TIME_FILTER_SECONDS = 30 * 24 * 60 * 60;

export function parseLinkedInTimeFilter(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "r86400";

  const lower = trimmed.toLowerCase();
  const shorthand = lower.match(/^(\d+)([smhd])$/);
  if (shorthand) {
    const amount = Number(shorthand[1]);
    const unit = shorthand[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    const seconds = amount * multipliers[unit];
    return formatLinkedInTimeFilter(seconds);
  }

  const digits = lower.replace(/^r/, "");
  if (!/^\d+$/.test(digits)) {
    throw new Error("Use r900, 15m, 1h, or seconds.");
  }
  return formatLinkedInTimeFilter(Number(digits));
}

export function formatLinkedInTimeFilter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Time filter must be positive.");
  }
  if (seconds > MAX_TIME_FILTER_SECONDS) {
    throw new Error("Time filter cannot exceed 30 days.");
  }
  return `r${Math.round(seconds)}`;
}

export function labelForLinkedInTimeFilter(value: string): string {
  const preset = LINKEDIN_TIME_PRESETS.find((item) => item.value === value);
  if (preset) return preset.label;
  const seconds = Number(value.replace(/^r/i, ""));
  if (!Number.isFinite(seconds) || seconds <= 0) return value;
  if (seconds % 86400 === 0) return `Last ${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `Last ${seconds / 3600}h`;
  if (seconds % 60 === 0) return `Last ${seconds / 60}m`;
  return `Last ${seconds}s`;
}
