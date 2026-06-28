import { mapResumeWithContent } from "@/lib/api/cv-api";
import type { ResumeWithContent } from "@/lib/types/cv";

const STORAGE_PREFIX = "yuse:print:";

export function resumePrintPath(resumeId: string, options?: { auto?: boolean }): string {
  const params = new URLSearchParams({ r: resumeId });
  if (options?.auto) {
    params.set("auto", "1");
  }
  return `/print?${params.toString()}`;
}

export function storePrintContent(resumeId: string, content: ResumeWithContent): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${resumeId}`, JSON.stringify(content));
  } catch {
    // Quota exceeded or private browsing — print page will fetch from server.
  }
}

export function readPrintContent(resumeId: string): ResumeWithContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${resumeId}`);
    if (!raw) return null;
    return mapResumeWithContent(JSON.parse(raw) as ResumeWithContent);
  } catch {
    return null;
  }
}

export function openResumePrint(resumeId: string, options?: { auto?: boolean }): void {
  const url = resumePrintPath(resumeId, options);
  window.open(url, "_blank", "noopener,noreferrer");
}
