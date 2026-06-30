import type { ContactProfile, Resume } from "@/lib/types/cv";
import { sanitizePdfFilename } from "@/lib/cv/export-pdf-vector";
import { DEFAULT_EXPORT_FILENAME_TEMPLATE } from "@/lib/cv/resume-design";

export function resolveExportFilename(
  template: string | undefined,
  resume: Resume,
  contactProfile?: ContactProfile
): string {
  const raw = template?.trim() || DEFAULT_EXPORT_FILENAME_TEMPLATE;
  const name = contactProfile?.fullName?.trim() || resume.title.trim() || "resume";
  const title = resume.title.trim() || name;
  const resolved = raw
    .replace(/\{name\}/gi, name)
    .replace(/\{title\}/gi, title)
    .replace(/\s+/g, " ")
    .trim();
  return sanitizePdfFilename(resolved || "resume");
}
