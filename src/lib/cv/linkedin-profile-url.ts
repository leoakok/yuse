const ALLOWED_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);

export function normalizeLinkedInProfileUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
        return null;
      }
      const match = parsed.pathname.match(/^\/in\/([a-zA-Z0-9-]+)\/?$/);
      if (!match?.[1]) {
        return null;
      }
      return `https://www.linkedin.com/in/${match[1]}`;
    } catch {
      return null;
    }
  }

  const slug = trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (!slug || !/^[a-zA-Z0-9-]+$/.test(slug)) {
    return null;
  }

  return `https://www.linkedin.com/in/${slug}`;
}
