"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import "@/components/layout/workspace-fab-fog.css";

/** Shared bottom-sheet surface styles for mobile drawers. */
export const drawerSheetContentClassName =
  "workspace-safe-area-bottom-pad w-full max-w-none max-h-[90vh] gap-0 overflow-hidden rounded-t-xl bg-background p-0";

/** Subtle panel tint for sidebars and inline workspace panels. */
export const workspacePanelSurfaceClassName = "bg-muted/10";

/** Stage tint behind document previews in desktop split view. */
export const workspacePreviewStageClassName = "bg-muted/40";

export function useWorkspacePanelSurfaceClassName(): string {
  return useDrawerShell() ? "" : workspacePanelSurfaceClassName;
}

export function useWorkspacePreviewStageClassName(): string {
  return useDrawerShell() ? "" : workspacePreviewStageClassName;
}

export type DrawerShellHeaderState = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

type DrawerShellRegistrationContextValue = {
  registerHeader: (state: DrawerShellHeaderState | null) => void;
};

const DrawerShellContext = React.createContext(false);
const DrawerShellRegistrationContext =
  React.createContext<DrawerShellRegistrationContextValue | null>(null);

export function useDrawerShell(): boolean {
  return React.useContext(DrawerShellContext);
}

export function useRegisterDrawerShellHeader(state: DrawerShellHeaderState | null) {
  const registration = React.useContext(DrawerShellRegistrationContext);

  React.useLayoutEffect(() => {
    if (!registration) return;
    registration.registerHeader(state);
    return () => {
      registration.registerHeader(null);
    };
  }, [registration, state]);
}

export function DrawerHandle({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto h-1 w-9 shrink-0 rounded-full bg-muted-foreground/25", className)}
      aria-hidden
    />
  );
}

export function DrawerShellClose({
  className,
  disabled,
  inline = false,
}: {
  className?: string;
  disabled?: boolean;
  /** When true, omits absolute positioning for grouped header layouts. */
  inline?: boolean;
}) {
  return (
    <SheetClose
      disabled={disabled}
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", !inline && "absolute top-0 right-3", className)}
          disabled={disabled}
          aria-label="Close"
        />
      }
    >
      <XIcon />
      <span className="sr-only">Close</span>
    </SheetClose>
  );
}

export interface DrawerShellProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Trailing header actions (plain icon buttons, not floating pills). */
  actions?: React.ReactNode;
  showCloseButton?: boolean;
  closeDisabled?: boolean;
  /** Body fills remaining height (workspace panels). */
  fill?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function DrawerShell({
  title,
  description,
  actions,
  showCloseButton = true,
  closeDisabled,
  fill = false,
  className,
  bodyClassName,
  children,
}: DrawerShellProps) {
  const hasHeader = Boolean(title || description || actions || showCloseButton);
  const hasTrailing = Boolean(actions || showCloseButton);

  return (
    <div className={cn("flex min-h-0 flex-col", fill && "flex-1", className)}>
      <div className="relative shrink-0 pt-2">
        <DrawerHandle className="mb-3" />
        {hasHeader ? (
          <div
            className={cn(
              "relative flex items-start gap-2 px-4 pb-3",
              hasTrailing && (actions ? "pr-32" : "pr-12")
            )}
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              {title ? (
                <SheetTitle className="text-left leading-snug">{title}</SheetTitle>
              ) : null}
              {description ? (
                <SheetDescription className="text-left">{description}</SheetDescription>
              ) : null}
            </div>
            {hasTrailing ? (
              <div className="absolute top-0 right-3 flex shrink-0 items-center gap-0.5">
                {actions}
                {showCloseButton ? <DrawerShellClose inline disabled={closeDisabled} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "min-h-0",
          fill ? "flex flex-1 flex-col overflow-hidden" : "overflow-y-auto",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface DrawerSheetContentProps
  extends Omit<
    React.ComponentProps<typeof SheetContent>,
    "side" | "showCloseButton" | "title" | "description"
  > {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  showCloseButton?: boolean;
  closeDisabled?: boolean;
  fill?: boolean;
  bodyClassName?: string;
}

export function DrawerSheetContent({
  title: titleProp,
  description: descriptionProp,
  actions: actionsProp,
  showCloseButton = true,
  closeDisabled,
  fill = false,
  className,
  bodyClassName,
  children,
  ...props
}: DrawerSheetContentProps) {
  const [registered, setRegistered] = React.useState<DrawerShellHeaderState>({});

  const registerHeader = React.useCallback((state: DrawerShellHeaderState | null) => {
    setRegistered(state ?? {});
  }, []);

  const title = titleProp ?? registered.title;
  const description = descriptionProp ?? registered.description;
  const actions = actionsProp ?? registered.actions;

  return (
    <SheetContent
      side="bottom"
      showCloseButton={false}
      className={cn(
        drawerSheetContentClassName,
        fill && "flex flex-col",
        className,
        // Dialog max-width classes (e.g. sm:max-w-lg) must not narrow bottom sheets.
        "w-full max-w-none sm:max-w-none"
      )}
      {...props}
    >
      <DrawerShellContext.Provider value={true}>
        <DrawerShellRegistrationContext.Provider value={{ registerHeader }}>
          <DrawerShell
            title={title}
            description={description}
            actions={actions}
            showCloseButton={showCloseButton}
            closeDisabled={closeDisabled}
            fill={fill}
            bodyClassName={bodyClassName}
          >
            {children}
          </DrawerShell>
        </DrawerShellRegistrationContext.Provider>
      </DrawerShellContext.Provider>
    </SheetContent>
  );
}
