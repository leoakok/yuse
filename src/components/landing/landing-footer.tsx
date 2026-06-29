import Link from "next/link";
import { YuseLogo } from "@/components/brand/yuse-logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <YuseLogo className="size-5" role="img" aria-label="Yuse" />
          <span className="font-medium text-foreground">Yuse</span>
          <span aria-hidden>·</span>
          <span>More than a one-page summary.</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link
            href="/login"
            className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get started
          </Link>
        </nav>
      </div>
    </footer>
  );
}
