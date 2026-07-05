import { notFound } from "next/navigation";
import { PortfolioSitePreview } from "@/components/portfolio/portfolio-site-preview";
import { fetchPublicContent } from "@/lib/portfolio/public-api";
import type { PortfolioWithContent } from "@/lib/types/portfolio";

interface PublicPortfolioViewProps {
  username: string;
  slug?: string;
  initialContent?: PortfolioWithContent;
}

export async function PublicPortfolioView({
  username,
  slug,
  initialContent,
}: PublicPortfolioViewProps) {
  let content = initialContent;
  if (!content) {
    const result = await fetchPublicContent(username, slug);
    if (result?.kind === "portfolio") {
      content = result.portfolio;
    }
  }
  if (!content) notFound();

  const name = content.contactProfile?.fullName || content.portfolio.title;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto min-h-screen max-w-5xl p-4 sm:p-8">
        <PortfolioSitePreview content={content} className="min-h-[calc(100vh-4rem)]" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Portfolio by {name} on Yuse
        </p>
      </div>
    </div>
  );
}
