import type {
  PortfolioAnimationLevel,
  PortfolioHeroStyle,
  PortfolioNavigationStyle,
  PortfolioProjectCardStyle,
  PortfolioProjectGridColumns,
} from "@/lib/types/portfolio";
import { cn } from "@/lib/utils";

export function projectGridClass(columns: PortfolioProjectGridColumns | undefined): string {
  switch (columns) {
    case "ONE":
      return "grid-cols-1";
    case "THREE":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case "TWO":
    default:
      return "grid-cols-1 sm:grid-cols-2";
  }
}

export function projectCardClass(
  style: PortfolioProjectCardStyle | undefined,
  featured = false
): string {
  const base = featured ? "mt-4" : "";
  switch (style) {
    case "MINIMAL":
      return cn(base, "rounded-lg border-0 bg-transparent p-3 shadow-none");
    case "IMAGE":
      return cn(base, "overflow-hidden rounded-xl border bg-card p-0");
    case "STANDARD":
    default:
      return cn(base, "rounded-xl border bg-card p-5", featured && "ring-1");
  }
}

export function heroClass(style: PortfolioHeroStyle | undefined): string {
  switch (style) {
    case "MINIMAL":
      return "bg-background text-foreground border-b";
    case "CENTERED":
      return "text-white text-center";
    case "GRADIENT":
    default:
      return "text-white";
  }
}

export function heroInnerClass(style: PortfolioHeroStyle | undefined): string {
  switch (style) {
    case "CENTERED":
      return "mx-auto flex max-w-3xl flex-col items-center gap-6";
    case "MINIMAL":
      return "mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center";
    case "GRADIENT":
    default:
      return "mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center";
  }
}

export function navigationClass(style: PortfolioNavigationStyle | undefined): string {
  switch (style) {
    case "STICKY":
      return "sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80";
    case "TOP":
      return "border-b bg-muted/30";
    case "NONE":
    default:
      return "";
  }
}

export function animationEnterClass(level: PortfolioAnimationLevel | undefined): string {
  switch (level) {
    case "FULL":
      return "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500";
    case "SUBTLE":
      return "motion-safe:transition-opacity motion-safe:duration-300";
    case "NONE":
    default:
      return "";
  }
}

export function animationHoverClass(level: PortfolioAnimationLevel | undefined): string {
  switch (level) {
    case "FULL":
      return "motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5";
    case "SUBTLE":
      return "motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-md";
    case "NONE":
    default:
      return "";
  }
}
