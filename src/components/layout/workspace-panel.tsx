import { type CSSProperties, type ReactNode } from "react";
import { List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  floatingChipClassName,
  floatingChipGroupClassName,
  floatingChipIconOnlyClassName,
} from "@/lib/ui/floating-chip";
import { motionPanelWidth } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";
import "./workspace-panel-scroll-fade.css";

export const workspacePanelHeaderClassName =
  "sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/60";

export const workspacePanelFloatingHeaderClassName =
  "sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 px-4 pt-3 pb-2 pointer-events-none";

function WorkspacePanelScrollFade({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "workspace-panel-scroll-fade",
        edge === "top" ? "workspace-panel-scroll-fade-top" : "workspace-panel-scroll-fade-bottom"
      )}
      aria-hidden
    />
  );
}

interface WorkspacePanelScrollViewportProps {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  /** Edge fades. true or "both" = top and bottom (default). false = none. "bottom" = bottom only. */
  scrollFade?: boolean | WorkspacePanelScrollFadeMode;
}

/** Scroll container with optional top and bottom edge fades (sections tab). */
export function WorkspacePanelScrollViewport({
  children,
  className,
  viewportClassName,
  scrollFade = true,
}: WorkspacePanelScrollViewportProps) {
  const { top: scrollFadeTop, bottom: scrollFadeBottom } = resolveScrollFadeEdges(scrollFade);

  return (
    <div className={cn("relative isolate flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {scrollFadeTop ? <WorkspacePanelScrollFade edge="top" /> : null}
      {scrollFadeBottom ? <WorkspacePanelScrollFade edge="bottom" /> : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", viewportClassName)}>{children}</div>
    </div>
  );
}

export type WorkspacePanelScrollFadeMode = false | "bottom" | "both";

function resolveScrollFadeEdges(
  scrollFade: boolean | WorkspacePanelScrollFadeMode = true
): { top: boolean; bottom: boolean } {
  if (scrollFade === false) {
    return { top: false, bottom: false };
  }
  if (scrollFade === "bottom") {
    return { top: false, bottom: true };
  }
  return { top: true, bottom: true };
}

interface WorkspacePanelScrollAreaFrameProps {
  children: ReactNode;
  className?: string;
  /** Edge fades. true or "both" = top and bottom (default). false = none. "bottom" = bottom only. */
  scrollFade?: boolean | WorkspacePanelScrollFadeMode;
}

/** Wraps ScrollArea (or any scroll root) with optional top and bottom edge fades. */
export function WorkspacePanelScrollAreaFrame({
  children,
  className,
  scrollFade = true,
}: WorkspacePanelScrollAreaFrameProps) {
  const { top: scrollFadeTop, bottom: scrollFadeBottom } = resolveScrollFadeEdges(scrollFade);
  const hasScrollFade = scrollFadeTop || scrollFadeBottom;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        hasScrollFade && "isolate",
        className
      )}
    >
      {scrollFadeTop ? <WorkspacePanelScrollFade edge="top" /> : null}
      {scrollFadeBottom ? <WorkspacePanelScrollFade edge="bottom" /> : null}
      {children}
    </div>
  );
}

export const workspacePanelScrollUnderFooterClassName =
  "workspace-panel-scroll-under-footer";

export const workspacePanelScrollUnderComposerClassName =
  "workspace-panel-scroll-under-composer";

export const workspacePanelFloatingChipClassName = floatingChipClassName;

export const workspacePanelFloatingIconChipClassName = floatingChipIconOnlyClassName;

interface WorkspacePanelProps {
  children: ReactNode;
  className?: string;
}

export function WorkspacePanel({ children, className }: WorkspacePanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>{children}</div>
  );
}

interface WorkspacePanelHeaderProps {
  leading?: ReactNode;
  /** Floating leading wrapper: default pill (px-3) or square icon chip (p-1). */
  leadingChip?: "default" | "icon";
  trailing?: ReactNode;
  className?: string;
  variant?: "bar" | "floating";
  /** Floating only: smooth blur fade below chips as scroll content passes underneath. */
  scrollFade?: boolean;
}

export function WorkspacePanelHeader({
  leading,
  leadingChip = "default",
  trailing,
  className,
  variant = "bar",
  scrollFade = false,
}: WorkspacePanelHeaderProps) {
  if (variant === "floating") {
    const leadingChipClassName =
      leadingChip === "icon"
        ? workspacePanelFloatingIconChipClassName
        : workspacePanelFloatingChipClassName;

    return (
      <div
        className={cn(
          workspacePanelFloatingHeaderClassName,
          scrollFade && "isolate",
          !leading && trailing && "justify-end",
          className
        )}
      >
        {scrollFade ? <WorkspacePanelScrollFade edge="top" /> : null}
        {leading ? (
          <div
            className={cn(
              leadingChipClassName,
              "pointer-events-auto relative z-10",
              leadingChip === "default" && "min-w-0 max-w-[70%]"
            )}
          >
            {leading}
          </div>
        ) : null}
        {trailing ? (
          <div
            className={cn(
              floatingChipGroupClassName,
              "pointer-events-auto relative z-10 shrink-0"
            )}
          >
            {trailing}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn(workspacePanelHeaderClassName, className)}>
      {leading ? <div className="min-w-0 flex-1 overflow-hidden">{leading}</div> : null}
      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}

interface WorkspacePanelBodyProps {
  children: ReactNode;
  className?: string;
}

export function WorkspacePanelBody({ children, className }: WorkspacePanelBodyProps) {
  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface ShellAsideProps {
  width: number;
  children: ReactNode;
  className?: string;
  side?: "left" | "right";
  /** Full-width single panel on compact viewports (below lg). */
  compact?: boolean;
}

export function ShellAside({
  width,
  children,
  className,
  side = "right",
  compact = false,
}: ShellAsideProps) {
  const isLeft = side === "left";
  const widthStyle = {
    "--shell-aside-width": `${width}px`,
  } as CSSProperties;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-muted/10",
        motionPanelWidth,
        isLeft
          ? cn(
              "border-r",
              compact
                ? "w-full min-w-0 flex-1"
                : "w-[var(--shell-aside-width)] min-w-[var(--shell-aside-width)] shrink-0"
            )
          : "hidden shrink-0 border-l lg:flex",
        className
      )}
      style={isLeft ? widthStyle : { width, minWidth: width }}
    >
      {children}
    </aside>
  );
}

export function EditorCollapsedRail({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-12 shrink-0 flex-col items-center border-r bg-muted/10 py-3",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={onOpen}
        aria-label="Open editor"
      >
        <List className="size-5" />
      </Button>
    </aside>
  );
}
