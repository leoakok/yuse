import { useId, type CSSProperties, type ReactNode } from "react";
import { List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  floatingChipClassName,
  floatingChipFogClassName,
  floatingChipFogGroupClassName,
  floatingChipGroupClassName,
} from "@/lib/ui/floating-chip";
import { motionPanelWidth } from "@/lib/ui/motion";
import {
  PIXEL_SCROLL_FOG_CELL_PX,
  PIXEL_SCROLL_FOG_HEIGHT_REM,
  PIXEL_SCROLL_FOG_MASK_WIDTH_PX,
  pixelScrollFogBlurFilterUrl,
  pixelScrollFogMask,
} from "@/lib/ui/pixel-scroll-fog";
import { cn } from "@/lib/utils";
import "./workspace-panel-scroll-fog.css";

export const workspacePanelHeaderClassName =
  "sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/60";

export const workspacePanelFloatingHeaderClassName =
  "sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 px-4 pt-3 pb-2 pointer-events-none";

function PixelScrollFogBlurFilter({ filterId }: { filterId: string }) {
  const cell = PIXEL_SCROLL_FOG_CELL_PX;
  const half = cell / 2;
  const sample = half - 0.5;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      width={0}
      height={0}
      className="workspace-panel-pixel-fog-filter"
    >
      <defs>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blurred" />
          <feFlood x={sample} y={sample} width="1" height="1" />
          <feComposite width={cell} height={cell} />
          <feTile result="pixel-grid" />
          <feComposite in="blurred" in2="pixel-grid" operator="in" result="pixelated" />
          <feMorphology in="pixelated" operator="dilate" radius={half} />
        </filter>
      </defs>
    </svg>
  );
}

function WorkspacePanelPixelScrollFog({ edge }: { edge: "top" | "bottom" }) {
  const reactId = useId().replace(/:/g, "");
  const filterId = `pixel-scroll-fog-blur-${reactId}`;
  const fogStyle = {
    "--pixel-fog-height": `${PIXEL_SCROLL_FOG_HEIGHT_REM}rem`,
    "--workspace-panel-pixel-fog-mask": pixelScrollFogMask,
    "--workspace-panel-pixel-fog-mask-width": `${PIXEL_SCROLL_FOG_MASK_WIDTH_PX}px`,
    "--workspace-panel-pixel-fog-blur-filter": pixelScrollFogBlurFilterUrl(filterId),
  } as CSSProperties;

  return (
    <div
      className={cn(
        "workspace-panel-pixel-fog",
        edge === "top" ? "workspace-panel-pixel-fog-top" : "workspace-panel-pixel-fog-bottom"
      )}
      style={fogStyle}
      aria-hidden
    >
      <PixelScrollFogBlurFilter filterId={filterId} />
    </div>
  );
}

export const workspacePanelFloatingFooterClassName =
  "sticky bottom-0 z-10 flex shrink-0 flex-col px-3 pb-3 pt-2 pointer-events-none";

export const workspacePanelFloatingChipClassName = floatingChipClassName;

interface WorkspacePanelProps {
  children: ReactNode;
  className?: string;
}

export function WorkspacePanel({ children, className }: WorkspacePanelProps) {
  return <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>;
}

interface WorkspacePanelHeaderProps {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  variant?: "bar" | "floating";
  /** Floating only: pixelated blur fade below chips so scroll content dissolves underneath. */
  scrollFog?: boolean;
}

export function WorkspacePanelHeader({
  leading,
  trailing,
  className,
  variant = "bar",
  scrollFog = false,
}: WorkspacePanelHeaderProps) {
  if (variant === "floating") {
    const chipClassName = scrollFog ? floatingChipFogClassName : workspacePanelFloatingChipClassName;
    const chipGroupClassName = scrollFog
      ? floatingChipFogGroupClassName
      : floatingChipGroupClassName;

    return (
      <div
        className={cn(
          workspacePanelFloatingHeaderClassName,
          scrollFog && "isolate",
          !leading && trailing && "justify-end",
          className
        )}
      >
        {scrollFog ? <WorkspacePanelPixelScrollFog edge="top" /> : null}
        {leading ? (
          <div className={cn(chipClassName, "pointer-events-auto relative z-10 min-w-0 max-w-[70%]")}>
            {leading}
          </div>
        ) : null}
        {trailing ? (
          <div
            className={cn(chipGroupClassName, "pointer-events-auto relative z-10 shrink-0")}
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
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface WorkspacePanelFloatingFooterProps {
  children: ReactNode;
  className?: string;
  /** Pixelated blur fade above chips so scroll content dissolves underneath. */
  scrollFog?: boolean;
}

export function WorkspacePanelFloatingFooter({
  children,
  className,
  scrollFog = false,
}: WorkspacePanelFloatingFooterProps) {
  return (
    <div
      className={cn(
        workspacePanelFloatingFooterClassName,
        scrollFog && "isolate",
        className
      )}
    >
      {scrollFog ? <WorkspacePanelPixelScrollFog edge="bottom" /> : null}
      <div className="pointer-events-auto relative z-10 w-full">{children}</div>
    </div>
  );
}

interface ShellAsideProps {
  width: number;
  children: ReactNode;
  className?: string;
  side?: "left" | "right";
}

export function ShellAside({ width, children, className, side = "right" }: ShellAsideProps) {
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
          ? "min-w-0 flex-1 border-r lg:w-[var(--shell-aside-width)] lg:min-w-[var(--shell-aside-width)] lg:shrink-0 lg:flex-none"
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
