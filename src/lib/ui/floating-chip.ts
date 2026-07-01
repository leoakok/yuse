/** Frosted glass pill used in nav, account menu, workspace panel headers, and composer. */
export const floatingChipClassName =
  "flex h-10 items-center rounded-full border border-border/50 bg-background/80 px-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60 motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-fast motion-safe:ease-motion-out";

/** Single frosted container wrapping multiple inline items (e.g. primary nav links). */
export const floatingChipGroupClassName =
  "flex items-center gap-1 rounded-full border border-border/50 bg-background/80 p-1 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60 motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-fast motion-safe:ease-motion-out";

/** Opaque pill for fog headers: no backdrop blur, content fades underneath instead. */
export const floatingChipFogClassName =
  "flex h-10 items-center rounded-full border border-border/50 bg-background px-3 shadow-sm";

/** Opaque grouped pill for fog headers: p-1 gutter with gap-1 between inner controls. */
export const floatingChipFogGroupClassName =
  "flex items-center gap-1 rounded-full border border-border/50 bg-background p-1 shadow-sm";

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

/** Opaque surface for fog footers: no backdrop blur, content fades underneath instead. */
export const floatingChipFogSurfaceClassName =
  "border border-border/50 bg-background shadow-sm";
