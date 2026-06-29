import Link from "next/link";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <YuseLogo className="size-7" role="img" aria-label="Yuse" />
          <span className="text-lg">Yuse</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
