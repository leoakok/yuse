import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingJobTracker } from "@/components/landing/landing-job-tracker";
import { LandingWhat } from "@/components/landing/landing-what";
import { LandingOpenSource } from "@/components/landing/landing-open-source";
import { LandingFooter } from "@/components/landing/landing-footer";

type LandingPageProps = {
  isSignedIn?: boolean;
};

export function LandingPage({ isSignedIn = false }: LandingPageProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <LandingNav isSignedIn={isSignedIn} />
      <main className="flex-1">
        <LandingHero />
        <LandingHow isSignedIn={isSignedIn} />
        <LandingJobTracker isSignedIn={isSignedIn} />
        <LandingWhat isSignedIn={isSignedIn} />
        <LandingOpenSource />
      </main>
      <LandingFooter isSignedIn={isSignedIn} />
    </div>
  );
}
