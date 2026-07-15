import { Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { GitHubMark } from "@/components/landing/brand-icons";
import { Reveal } from "@/components/landing/reveal";
import {
  YUSE_GITHUB_CONTRIBUTING_URL,
  YUSE_GITHUB_URL,
} from "@/lib/site/github";

export function LandingOpenSource() {
  return (
    <section className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-14">
        <Reveal className="max-w-xl">
          <div className="flex items-center gap-2.5">
            <GitHubMark className="size-5" />
            <h2 className="font-serif text-2xl tracking-tight">Open source on GitHub</h2>
          </div>
        </Reveal>
        <Reveal delay={60} className="flex flex-wrap gap-2">
          <a
            href={YUSE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "px-4")}
          >
            <GitHubMark className="size-4" />
            View repository
          </a>
          <a
            href={YUSE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}
          >
            <Star className="size-4" />
            Star
          </a>
          <a
            href={YUSE_GITHUB_CONTRIBUTING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-4")}
          >
            Contribute
          </a>
        </Reveal>
      </div>
    </section>
  );
}
