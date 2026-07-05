import { cn } from "@/lib/utils";

/** Vertical stack of editor sections separated by dividers. */
export const workspaceSectionsClassName = "divide-y divide-border/60";

/** Section title row: heading plus optional actions. */
export const workspaceSectionHeaderClassName =
  "flex items-center justify-between gap-2 px-4 py-3 lg:px-5";

export const workspaceSectionTitleClassName = "min-w-0 text-sm font-semibold";

/** Section header edit affordance: always visible on mobile, hover reveal on desktop. */
export const workspaceSectionEditButtonClassName =
  "shrink-0 text-muted-foreground opacity-0 transition-opacity max-lg:opacity-100 group-hover/title:opacity-100 group-focus-within/title:opacity-100 focus-visible:opacity-100 motion-reduce:opacity-100";

export const workspaceSectionSubtitleClassName = "text-xs text-muted-foreground";

/** Primary content area below a section header. */
export const workspaceSectionBodyClassName = "space-y-3 px-4 pb-4 lg:px-5";

/** List rows inside a section (hover highlight, no outer border). */
export const workspaceRowClassName =
  "px-4 py-2.5 text-sm transition-colors hover:bg-muted/40 lg:px-5";

export const workspaceRowListClassName = "divide-y divide-border/60";

/** Action button cluster at the end of a list row. Always visible. */
export const workspaceRowActionsClassName = "flex shrink-0 items-center gap-0.5";

/** Icon ghost buttons inside workspace list rows. */
export const workspaceRowActionButtonClassName =
  "text-foreground/70 hover:text-foreground";

/** Muted copy for hidden-from-preview rows (text only, not row opacity). */
export const workspaceRowHiddenClassName = "text-muted-foreground";

/** Intro or helper copy at the top of a workspace (no card box). */
export const workspaceIntroClassName = "px-4 py-4 text-sm lg:px-5";

export function workspaceSectionClassName(className?: string) {
  return cn(workspaceSectionsClassName, className);
}
