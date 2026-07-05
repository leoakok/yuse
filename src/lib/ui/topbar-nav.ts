import { motionTransitionColors } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

/** Muted inset track grouping related topbar controls (nav links, account, menu). */
export const topbarTrackClassName =
  "flex items-center gap-0.5 rounded-lg bg-muted/50 p-1";

/** Segment inside a topbar track: nav link, account trigger, or icon control. */
export function topbarSegmentClassName(isActive = false, className?: string) {
  return cn(
    "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium",
    motionTransitionColors,
    isActive
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:bg-background/60 hover:text-foreground aria-expanded:bg-background aria-expanded:text-foreground aria-expanded:shadow-sm aria-expanded:hover:bg-background",
    className
  );
}

/** Square icon-only segment for menu triggers inside a topbar track. */
export function topbarIconSegmentClassName(className?: string) {
  return topbarSegmentClassName(false, cn("size-9 justify-center gap-0 p-0", className));
}

/** Vertical nav list container for mobile sheet. */
export const topbarVerticalNavClassName = "flex flex-col gap-1 p-4";
