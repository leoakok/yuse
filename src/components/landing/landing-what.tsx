import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

export function LandingWhat() {
  return (
    <section className="border-t border-border/60">
      <div className="relative mx-auto w-full max-w-4xl px-5 py-24 sm:px-8 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
        />

        <Reveal className="relative flex flex-col items-center text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            What I am
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            An AI-native CV builder that grows with you
          </h2>
          <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Bring your GitHub, your LinkedIn, and your story. I&apos;ll turn them
            into a CV that&apos;s unmistakably you — tailored for every role you
            want next.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "px-5")}
            >
              Get started
              <ArrowRight />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "px-5",
              )}
            >
              Sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
