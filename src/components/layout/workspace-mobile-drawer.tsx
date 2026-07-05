"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCvAssistantOptional } from "@/components/agent/cv-assistant-provider";
import { CvAssistantPanel } from "@/components/agent/cv-assistant-panel";
import { NavLinks } from "@/components/layout/app-nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";
import { useWorkspacePreviewRegistration } from "@/components/layout/workspace-preview-registration";
import { DrawerSheetContent } from "@/components/ui/drawer-shell";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { topbarTrackClassName, topbarVerticalNavClassName } from "@/lib/ui/topbar-nav";
import { cn } from "@/lib/utils";

export type WorkspaceMobileDrawer = "preview" | "assistant" | "nav";

const workspaceDrawerSheetClassName =
  "min-h-[70vh] max-h-[90vh] flex flex-col";

interface WorkspaceMobileDrawerContextValue {
  drawer: WorkspaceMobileDrawer | null;
  openDrawer: (drawer: WorkspaceMobileDrawer) => void;
  closeDrawer: () => void;
  toggleDrawer: (drawer: WorkspaceMobileDrawer) => void;
  isDrawerOpen: (drawer: WorkspaceMobileDrawer) => boolean;
}

const WorkspaceMobileDrawerContext = createContext<WorkspaceMobileDrawerContextValue | null>(
  null
);

export function WorkspaceMobileDrawerProvider({ children }: { children: ReactNode }) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const assistant = useCvAssistantOptional();
  const assistantSetOpenRef = useRef(assistant?.setOpen);
  assistantSetOpenRef.current = assistant?.setOpen;

  const [drawer, setDrawer] = useState<WorkspaceMobileDrawer | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    assistantSetOpenRef.current?.(false);
  }, []);

  const openDrawer = useCallback((next: WorkspaceMobileDrawer) => {
    // Defer until after the opening pointer/click cycle completes. Without this,
    // Base UI treats the same click as an outside press and closes immediately.
    queueMicrotask(() => {
      setDrawer(next);
      if (next === "assistant") {
        assistantSetOpenRef.current?.(true);
      } else {
        assistantSetOpenRef.current?.(false);
      }
    });
  }, []);

  const toggleDrawer = useCallback(
    (next: WorkspaceMobileDrawer) => {
      if (drawer === next) {
        closeDrawer();
        return;
      }
      openDrawer(next);
    },
    [closeDrawer, drawer, openDrawer]
  );

  const isDrawerOpen = useCallback((target: WorkspaceMobileDrawer) => drawer === target, [drawer]);

  useEffect(() => {
    if (isLargeScreen) {
      setDrawer(null);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    if (isLargeScreen || !assistant?.isOpen) return;
    queueMicrotask(() => {
      setDrawer((current) => (current === "assistant" ? current : "assistant"));
    });
  }, [assistant?.isOpen, isLargeScreen]);

  const value = useMemo(
    () => ({
      drawer,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      isDrawerOpen,
    }),
    [closeDrawer, drawer, isDrawerOpen, openDrawer, toggleDrawer]
  );

  return (
    <WorkspaceMobileDrawerContext.Provider value={value}>
      {children}
    </WorkspaceMobileDrawerContext.Provider>
  );
}

export function useWorkspaceMobileDrawer() {
  const ctx = useContext(WorkspaceMobileDrawerContext);
  if (!ctx) {
    throw new Error("useWorkspaceMobileDrawer must be used within WorkspaceMobileDrawerProvider");
  }
  return ctx;
}

export function useWorkspaceMobileDrawerOptional() {
  return useContext(WorkspaceMobileDrawerContext);
}

function MobileNavDrawerContent({
  showAccount,
  onNavigate,
}: {
  showAccount: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <NavLinks
          variant="topbar"
          orientation="vertical"
          className={topbarVerticalNavClassName}
          onNavigate={onNavigate}
        />
        {showAccount ? (
          <div className="mt-auto border-t p-4">
            <div className={topbarTrackClassName}>
              <UserMenuButton className="w-full justify-start" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function drawerTitle(drawer: WorkspaceMobileDrawer | null): string | undefined {
  switch (drawer) {
    case "preview":
      return "Preview";
    case "nav":
      return "Menu";
    case "assistant":
      return undefined;
    default:
      return undefined;
  }
}

export function WorkspaceMobileDrawers({ showAccount = true }: { showAccount?: boolean }) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const { drawer, closeDrawer } = useWorkspaceMobileDrawer();
  const { previewContent } = useWorkspacePreviewRegistration();
  const [renderDrawer, setRenderDrawer] = useState<WorkspaceMobileDrawer | null>(null);

  useEffect(() => {
    if (drawer !== null) {
      setRenderDrawer(drawer);
    }
  }, [drawer]);

  if (isLargeScreen) {
    return null;
  }

  const isOpen = drawer !== null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeDrawer();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setRenderDrawer(null);
      }}
    >
      <DrawerSheetContent
        fill
        title={drawerTitle(renderDrawer)}
        className={cn(workspaceDrawerSheetClassName)}
      >
        {renderDrawer === "preview" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{previewContent}</div>
        ) : null}
        {renderDrawer === "assistant" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CvAssistantPanel variant="drawer" />
          </div>
        ) : null}
        {renderDrawer === "nav" ? (
          <MobileNavDrawerContent showAccount={showAccount} onNavigate={closeDrawer} />
        ) : null}
      </DrawerSheetContent>
    </Sheet>
  );
}
