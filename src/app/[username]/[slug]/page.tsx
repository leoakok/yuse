import type { Metadata } from "next";
import { PublicPortfolioView } from "@/components/portfolio/public-portfolio-view";
import { fetchPublicPortfolio } from "@/lib/portfolio/public-api";
import { buildPublicPortfolioMetadata } from "@/lib/portfolio/public-metadata";

interface PublicPortfolioSlugPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PublicPortfolioSlugPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const content = await fetchPublicPortfolio(username, slug);
  if (!content) {
    return { title: "Portfolio not found" };
  }
  return buildPublicPortfolioMetadata(content);
}

export default async function PublicPortfolioSlugPage({ params }: PublicPortfolioSlugPageProps) {
  const { username, slug } = await params;
  return <PublicPortfolioView username={username} slug={slug} />;
}
