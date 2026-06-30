export function normalizeLinkedInProfileUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return /linkedin\.com\/in\//i.test(trimmed) ? trimmed : null;
  }

  const slug = trimmed.replace(/^@/, "").replace(/\/$/, "");
  if (!slug || slug.includes("/") || slug.includes(" ")) {
    return null;
  }

  return `https://www.linkedin.com/in/${slug}`;
}
