import type { ReactNode } from "react";
import { GitHubMark } from "@/components/brand/github-mark";
import { Reveal } from "@/components/landing/reveal";
import { TailorDemo } from "@/components/landing/tailor-demo";
import { TailorCvShowcase } from "@/components/landing/tailor-cv-showcase";
import { LinkedInMark } from "@/components/landing/brand-icons";

type Step = {
  icon: ReactNode;
  title: string;
};

const STEPS: Step[] = [
  { icon: null, title: "Learn your story over time" },
  { icon: <GitHubMark className="size-4" />, title: "Pull from GitHub" },
  { icon: <LinkedInMark className="size-4" />, title: "Bring in LinkedIn" },
  { icon: null, title: "Paste a job link" },
];

export function LandingHow({ isSignedIn = false }: { isSignedIn?: boolean }) {
  return (
    <section id="how" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance font-serif text-3xl tracking-tight sm:text-4xl">
            How it works
          </h2>
        </Reveal>

        <ol className="mt-10 max-w-3xl divide-y divide-border/60 border-y border-border/60">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 50}>
              <div className="grid gap-3 py-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6 sm:items-center">
                <span className="font-serif text-2xl tabular-nums text-muted-foreground/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  {step.icon}
                  {step.title}
                </h3>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-14" delay={80}>
          <TailorDemo />
        </Reveal>

        <Reveal className="mt-10" delay={100}>
          <TailorCvShowcase isSignedIn={isSignedIn} />
        </Reveal>
      </div>
    </section>
  );
}
