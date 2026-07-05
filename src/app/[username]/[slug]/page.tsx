import { notFound } from "next/navigation";
import { PublicResumeView } from "@/components/cv/public-resume-view";
import { PublicPortfolioView } from "@/components/portfolio/public-portfolio-view";
import { fetchPublicContent } from "@/lib/portfolio/public-api";
import { buildPublicPortfolioMetadata } from "@/lib/portfolio/public-metadata";

interface PublicSlugPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PublicSlugPageProps) {
  const { username, slug } = await params;
  const content = await fetchPublicContent(username, slug);
  if (!content) {
    return { title: "Not found" };
  }
  if (content.kind === "portfolio") {
    return buildPublicPortfolioMetadata(content.portfolio);
  }
  const name = content.resume.contactProfile?.fullName || content.resume.resume.title;
  return { title: `${name} | Resume` };
}

export default async function PublicSlugPage({ params }: PublicSlugPageProps) {
  const { username, slug } = await params;
  const content = await fetchPublicContent(username, slug);
  if (!content) notFound();
  if (content.kind === "resume") {
    return <PublicResumeView content={content.resume} />;
  }
  return <PublicPortfolioView username={username} slug={slug} initialContent={content.portfolio} />;
}
