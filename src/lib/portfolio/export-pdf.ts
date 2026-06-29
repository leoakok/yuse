import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { portfolioToPreviewContent } from "@/lib/portfolio/preview";
import { openResumePrint, storePrintContent } from "@/lib/cv/print";

/** Opens print view using shared CvPreview pipeline (portfolio mapped to resume shape). */
export async function exportPortfolioPdf(options: {
  content: PortfolioWithContent;
  filename: string;
}): Promise<void> {
  const preview = portfolioToPreviewContent(options.content);
  storePrintContent(preview.resume.id, preview);
  openResumePrint(preview.resume.id, { auto: true });
}
