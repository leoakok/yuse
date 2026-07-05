const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function sanitizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, trimmed.startsWith("/") ? "https://invalid.local" : undefined);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      if (!parsed.hostname) {
        return null;
      }
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function isSafeJobUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.startsWith("manual://")) {
    return true;
  }
  const safe = sanitizeExternalUrl(trimmed);
  if (!safe) {
    return false;
  }
  try {
    const parsed = new URL(safe);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
