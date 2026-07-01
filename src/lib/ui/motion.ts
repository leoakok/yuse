/**
 * Default motion design tokens as Tailwind class sets.
 * Durations and easings live in globals.css (@theme + :root).
 * Use these instead of ad-hoc transition-* values for consistency.
 */

/** Color and background transitions (nav, list rows, chips). */
export const motionTransitionColors =
  "motion-safe:transition-colors motion-safe:duration-fast motion-safe:ease-motion-out";

/** Interactive surfaces: color, opacity, shadow, transform. */
export const motionTransitionInteractive =
  "motion-safe:transition-[color,background-color,border-color,opacity,box-shadow,transform] motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none";

/** Opacity-only (hover reveals, fades). */
export const motionTransitionOpacity =
  "motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-motion-out motion-reduce:transition-none";

/** Transform (chevrons, icons). */
export const motionTransitionTransform =
  "motion-safe:transition-transform motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none";

/** Buttons and badges. */
export const motionButton =
  "motion-safe:transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-safe:duration-fast motion-safe:ease-motion-out motion-reduce:transition-none";

/** Popup overlay backdrop. */
export const motionOverlay =
  "motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-motion-out motion-reduce:transition-none";

/** Dialog content scale and opacity. */
export const motionDialogContent =
  "motion-safe:transition-[opacity,transform] motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:opacity-100 motion-reduce:data-starting-style:opacity-100";

/** Sheet panel slide and opacity. */
export const motionSheetContent =
  "motion-safe:transition-[opacity,transform] motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:opacity-100 motion-reduce:data-starting-style:opacity-100";

/** Dropdown and select popup enter/exit. */
export const motionPopupEnter =
  "motion-safe:duration-fast motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95";

/** Directional slide hints for positioned popups. */
export const motionPopupSlide =
  "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/** Content mount: fade in. */
export const motionEnterFade =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-default";

/** Content mount: fade with subtle rise. */
export const motionEnterFadeUp =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-default";

/** Hover action bar (edit, copy buttons). */
export const motionHoverReveal =
  "opacity-0 motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-motion-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:opacity-100";

/** Hover reveal for a named group (e.g. group/msg, group/item). */
export function motionHoverRevealGroup(group: string): string {
  return `opacity-0 motion-safe:transition-opacity motion-safe:duration-fast motion-safe:ease-motion-out group-hover/${group}:opacity-100 group-focus-within/${group}:opacity-100 motion-reduce:opacity-100`;
}

/** Floating chrome position shifts. */
export const motionChromeShift =
  "motion-safe:transition-[right,left,transform] motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none";

/** Panel width changes. */
export const motionPanelWidth =
  "motion-safe:transition-[width,min-width] motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none";

/** Accordion chevron rotation. */
export const motionAccordionChevron =
  "motion-safe:transition-transform motion-safe:duration-default motion-safe:ease-motion-out group-data-[panel-open]:rotate-180 motion-reduce:transition-none";

/** Skeleton loading pulse. */
export const motionSkeleton =
  "motion-safe:animate-pulse motion-reduce:animate-none";

/** Status indicator ping. */
export const motionPing =
  "motion-safe:animate-ping motion-reduce:animate-none";
