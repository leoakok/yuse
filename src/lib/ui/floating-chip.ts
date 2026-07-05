import { cn } from "@/lib/utils";

/** Frosted glass pill used in nav, account menu, workspace panel headers, and composer. */
export const floatingChipClassName =
  "flex h-10 items-center rounded-full border border-border/50 bg-background/80 px-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60 motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-fast motion-safe:ease-motion-out";

/** Single frosted container wrapping multiple inline items (e.g. primary nav links). */
export const floatingChipGroupClassName =
  "flex items-center gap-1 rounded-full border border-border/50 bg-background/80 p-1 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60 motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-fast motion-safe:ease-motion-out";

/** Square frosted chip for a single icon control. Uniform p-1 inset, not h-10 + px-3. */
export const floatingChipIconOnlyClassName =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80 p-1 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60 motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-fast motion-safe:ease-motion-out";

/** Icon button inside a floating chip: circular hover, inset within h-10 pill. */
export const floatingChipIconButtonClassName =
  "size-8 shrink-0 rounded-full hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/40";

/** Text button inside a floating chip: pill-shaped hover, inset within h-10 pill. */
export const floatingChipTextButtonClassName =
  "h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-xs hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/40";

/** Nav link inside a floating chip group: full h-10 height, no wrap, pill-shaped hover. */
export const floatingChipNavLinkClassName =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/40";

/** Surface styles without layout or shape; for elements that set their own radius. */
export const floatingChipSurfaceClassName =
  "border border-border/50 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60";

/**
 * Workspace z-index scale (compact mobile view):
 * - 10: sticky panel headers, scroll content; FAB row inside bottom chrome
 * - 40: workspace bottom chrome (fog z-0, FAB row z-10 within isolate)
 * - 50: composer footer with scroll fade, sheets, dialogs, dropdowns
 */

/** Compact workspace FABs (Preview, Yuse). Light surface; bottom fog provides the frosted zone. */
export const workspaceFabBaseClassName =
  "flex h-10 items-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65 motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-fast motion-safe:ease-motion-out";

export function workspaceFabClassName(isActive: boolean) {
  return cn(
    workspaceFabBaseClassName,
    isActive
      ? "border-border/80 bg-muted/70 text-foreground"
      : "text-foreground hover:border-border/70 hover:bg-background/90"
  );
}

/** CSS class for the fixed bottom fog strip (see workspace-fab-fog.css). */
export const workspaceFabFogClassName = "workspace-fab-fog";

/** Bottom offset for compact workspace FABs from the viewport edge. */
export const workspaceFabBottomClassName =
  "bottom-[env(safe-area-inset-bottom,0px)]";

