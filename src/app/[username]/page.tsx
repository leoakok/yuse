import type { Metadata } from "next";
import { PublicPortfolioView } from "@/components/portfolio/public-portfolio-view";
import { fetchPublicContent } from "@/lib/portfolio/public-api";
import { buildPublicPortfolioMetadata } from "@/lib/portfolio/public-metadata";

interface PublicPortfolioPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicPortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const content = await fetchPublicContent(username);
  if (!content || content.kind !== "portfolio") {
    return { title: "Portfolio not found" };
  }
  return buildPublicPortfolioMetadata(content.portfolio);
}

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { username } = await params;
  const content = await fetchPublicContent(username);
  const initialContent = content?.kind === "portfolio" ? content.portfolio : undefined;
  return <PublicPortfolioView username={username} initialContent={initialContent} />;
}
