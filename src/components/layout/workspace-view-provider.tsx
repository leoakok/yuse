"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { isDocumentWorkspacePath } from "@/lib/ui/document-workspace-route";

export type WorkspaceView = "edit" | "preview" | "assistant";

interface WorkspaceViewContextValue {
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  isLargeScreen: boolean;
  hasPreview: boolean;
  isDocumentWorkspace: boolean;
}

const WorkspaceViewContext = createContext<WorkspaceViewContextValue | null>(null);

export function WorkspaceViewProvider({
  children,
  hasPreview = false,
  isDocumentWorkspace = false,
}: {
  children: ReactNode;
  hasPreview?: boolean;
  isDocumentWorkspace?: boolean;
}) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [view, setViewState] = useState<WorkspaceView>("edit");

  const setView = useCallback(
    (next: WorkspaceView) => {
      if (next === "preview" && !hasPreview) {
        setViewState("edit");
        return;
      }
      setViewState(next);
    },
    [hasPreview]
  );

  const value = useMemo(
    () => ({
      view,
      setView,
      isLargeScreen,
      hasPreview,
      isDocumentWorkspace,
    }),
    [view, setView, isLargeScreen, hasPreview, isDocumentWorkspace]
  );

  return (
    <WorkspaceViewContext.Provider value={value}>{children}</WorkspaceViewContext.Provider>
  );
}

export function useWorkspaceView() {
  const ctx = useContext(WorkspaceViewContext);
  if (!ctx) {
    throw new Error("useWorkspaceView must be used within WorkspaceViewProvider");
  }
  return ctx;
}

/** Safe defaults for layout helpers outside document workspaces. */
export function useWorkspaceLayoutMode() {
  const pathname = usePathname() ?? "";
  const ctx = useContext(WorkspaceViewContext);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  return useMemo(
    () => ({
      view: (ctx?.view ?? "edit") as WorkspaceView,
      setView: ctx?.setView ?? (() => {}),
      isLargeScreen: ctx?.isLargeScreen ?? isLargeScreen,
      hasPreview: ctx?.hasPreview ?? false,
      hasWorkspaceView:
        ctx?.isDocumentWorkspace ?? isDocumentWorkspacePath(pathname),
    }),
    [ctx, isLargeScreen, pathname]
  );
}
