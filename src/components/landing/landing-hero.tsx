import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft accent glow, reusing the app's primary tone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 pt-24 pb-20 text-center sm:px-8 sm:pt-32 sm:pb-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Your CV, the way it should have always been
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            You are more than a
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">one-page summary.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
            I believe every application deserves a CV that actually reflects who
            you are. Generic resumes flatten years of real work into tired
            bullet points. I&apos;m here to change that — for every single role
            you go after.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "px-5")}
            >
              Get started
              <ArrowRight />
            </Link>
            <Link
              href="#how"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "px-5",
              )}
            >
              See how it works
            </Link>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-4 text-xs text-muted-foreground">
            Free to start · Sign in with Google
          </p>
        </Reveal>
      </div>
    </section>
  );
}
