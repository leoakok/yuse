"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { cn } from "@/lib/utils";

type LandingNavProps = {
  isSignedIn?: boolean;
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Fixed top bar: CTA always visible at top-right.
 * Brand chrome (logo, blur, border) reveals after scroll.
 */
export function LandingNav({ isSignedIn = false }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-md font-semibold tracking-tight transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            focusRing,
            scrolled
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0",
          )}
          tabIndex={scrolled ? undefined : -1}
          aria-hidden={!scrolled}
        >
          <YuseLogo className="size-7" role="img" aria-label="Yuse" />
          <span className="text-lg">Yuse</span>
        </Link>

        <nav aria-label="Account">
          {isSignedIn ? (
            <Link
              href="/home"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium tracking-tight text-background shadow-sm transition-colors hover:bg-foreground/90",
                focusRing,
              )}
            >
              Go to app
              <ArrowRight className="size-3.5 opacity-70" aria-hidden />
            </Link>
          ) : (
            <div
              className={cn(
                "flex items-center rounded-full p-1 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
                scrolled
                  ? "border border-transparent bg-transparent shadow-none"
                  : "border border-border/70 bg-background/75 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md",
              )}
            >
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-4 text-sm font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground",
                  focusRing,
                )}
              >
                Sign in
              </Link>
              <Link
                href="#waitlist"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium tracking-tight text-background transition-colors hover:bg-foreground/90",
                  focusRing,
                )}
              >
                Sign up
                <ArrowRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
