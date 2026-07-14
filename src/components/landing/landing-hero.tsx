"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

/**
 * First viewport: brand + Why only.
 * Rams / Ive: less but better. No CTAs, no feature copy, one scroll cue.
 */
export function LandingHero() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      aria-label="Welcome"
      className="relative flex min-h-dvh w-full flex-col"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <div className="flex items-center gap-3">
            <YuseLogo
              className="size-10 sm:size-11"
              role="img"
              aria-label="Yuse"
            />
            <span className="font-serif text-3xl tracking-tight sm:text-4xl">
              Yuse
            </span>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="mt-10 max-w-[18ch] text-balance font-serif text-[2.5rem] leading-[1.05] tracking-tight sm:mt-12 sm:text-6xl sm:leading-[1.02] lg:text-7xl">
            You are more than a one-page summary.
          </h1>
        </Reveal>
      </div>

      <a
        href="#how"
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-10 pt-4 outline-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
          scrolled ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-label="Scroll to how it works"
      >
        <span className="text-sm text-muted-foreground">Scroll</span>
        <ChevronDown
          className="size-5 text-muted-foreground motion-safe:animate-[landing-scroll-cue_2.2s_ease-in-out_infinite]"
          aria-hidden
        />
      </a>
    </section>
  );
}
