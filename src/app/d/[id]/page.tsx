import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicDesignView } from "@/components/cv/public-design-view";
import { fetchPublicDesign } from "@/lib/design/public-api";

interface PublicDesignPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicDesignPageProps) {
  const { id } = await params;
  const content = await fetchPublicDesign(id);
  if (!content) {
    return { title: "Not found" };
  }
  const title = content.designShare.title || "CV design";
  return { title: `${title} | Yuse` };
}

export default async function PublicDesignPage({ params }: PublicDesignPageProps) {
  const { id } = await params;
  const [content, session] = await Promise.all([fetchPublicDesign(id), auth()]);
  if (!content) notFound();
  return <PublicDesignView content={content} isSignedIn={Boolean(session?.user)} />;
}
