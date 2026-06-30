import type { Metadata } from "next";
import { PublicPortfolioView } from "@/components/portfolio/public-portfolio-view";
import { fetchPublicPortfolio } from "@/lib/portfolio/public-api";
import { buildPublicPortfolioMetadata } from "@/lib/portfolio/public-metadata";

interface PublicPortfolioPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicPortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const content = await fetchPublicPortfolio(username);
  if (!content) {
    return { title: "Portfolio not found" };
  }
  return buildPublicPortfolioMetadata(content);
}

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { username } = await params;
  return <PublicPortfolioView username={username} />;
}
