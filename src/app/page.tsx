import type { Metadata } from "next";
import { auth } from "@/auth";
import { JsonLd } from "@/components/seo/json-ld";
import { LandingPage } from "@/components/landing/landing-page";
import { buildHomeMetadata, buildLandingJsonLd } from "@/lib/site/metadata";

export const metadata: Metadata = buildHomeMetadata();

export default async function RootPage() {
  const session = await auth();

  return (
    <>
      <JsonLd data={buildLandingJsonLd()} />
      <LandingPage isSignedIn={!!session?.user} />
    </>
  );
}
