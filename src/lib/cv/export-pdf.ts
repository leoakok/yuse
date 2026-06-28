import type { ResumeWithContent } from "@/lib/types/cv";
import { sanitizePdfFilename } from "@/lib/cv/export-pdf-vector";
import { openResumePrint, storePrintContent } from "@/lib/cv/print";

export { sanitizePdfFilename };

/**
 * Opens the dedicated print view for the resume and triggers the browser print dialog.
 */
export async function exportResumePdf(options: {
  content: ResumeWithContent;
  filename: string;
}): Promise<void> {
  storePrintContent(options.content.resume.id, options.content);
  openResumePrint(options.content.resume.id, { auto: true });
}
