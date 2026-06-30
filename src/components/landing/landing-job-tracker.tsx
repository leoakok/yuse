import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { JobTrackerDemo } from "@/components/landing/job-tracker-demo";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

type LandingJobTrackerProps = {
  isSignedIn?: boolean;
};

export function LandingJobTracker({ isSignedIn = false }: LandingJobTrackerProps) {
  return (
    <section id="job-tracker" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Job tracker
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Track every application in one place
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Every role you tailor lands on my board. Drag cards as you progress —
            from saved to applied, interview, and offer — so nothing slips through.
          </p>
        </Reveal>

        <Reveal className="mt-12" delay={80}>
          <JobTrackerDemo />
        </Reveal>

        {!isSignedIn ? (
          <Reveal className="mt-8 flex justify-center" delay={120}>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-5")}
            >
              Start tracking your applications
              <ArrowRight />
            </Link>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
