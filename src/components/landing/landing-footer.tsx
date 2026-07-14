import Link from "next/link";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { GitHubMark } from "@/components/landing/brand-icons";
import { YUSE_GITHUB_URL } from "@/lib/site/github";

type LandingFooterProps = {
  isSignedIn?: boolean;
};

export function LandingFooter({ isSignedIn = false }: LandingFooterProps) {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <YuseLogo className="size-5" role="img" aria-label="Yuse" />
          <span className="font-medium text-foreground">Yuse</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <a
            href={YUSE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GitHubMark className="size-3.5" />
            GitHub
          </a>
          {isSignedIn ? (
            <Link
              href="/home"
              className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go to app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign in
              </Link>
              <Link
                href="/#waitlist"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Join the beta
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
