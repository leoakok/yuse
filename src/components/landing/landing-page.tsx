import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingWhat } from "@/components/landing/landing-what";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingHow />
        <LandingWhat />
      </main>
      <LandingFooter />
    </div>
  );
}
