import type { Metadata } from "next";
import { auth } from "@/auth";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Yuse, More than a one-page summary",
  description:
    "Yuse is an AI-native CV builder that learns your real work, connects your GitHub and LinkedIn, and tailors a CV to every job you go after.",
  openGraph: {
    title: "Yuse, More than a one-page summary",
    description:
      "Yuse is an AI-native CV builder that learns your real work, connects your GitHub and LinkedIn, and tailors a CV to every job you go after.",
    images: [{ url: "/social/og-homepage.png", width: 1200, height: 900, alt: "Yuse, More than a one-page summary" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yuse, More than a one-page summary",
    description:
      "Yuse is an AI-native CV builder that learns your real work, connects your GitHub and LinkedIn, and tailors a CV to every job you go after.",
    images: ["/social/og-homepage.png"],
  },
};

export default async function RootPage() {
  const session = await auth();

  return <LandingPage isSignedIn={!!session?.user} />;
}
