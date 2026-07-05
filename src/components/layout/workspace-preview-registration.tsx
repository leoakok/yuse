"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PreviewDrawerActions = {
  onShare?: () => void;
  onDownload?: () => void | Promise<void>;
  isDownloading?: boolean;
  shareLabel?: string;
};

interface WorkspacePreviewRegistrationContextValue {
  hasPreview: boolean;
  setHasPreview: (value: boolean) => void;
  previewContent: ReactNode | null;
  setPreviewContent: (content: ReactNode | null) => void;
  previewDrawerActions: PreviewDrawerActions | null;
  setPreviewDrawerActions: (actions: PreviewDrawerActions | null) => void;
}

const WorkspacePreviewRegistrationContext =
  createContext<WorkspacePreviewRegistrationContextValue | null>(null);

export function WorkspacePreviewRegistrationProvider({ children }: { children: ReactNode }) {
  const [hasPreview, setHasPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<ReactNode | null>(null);
  const [previewDrawerActions, setPreviewDrawerActions] = useState<PreviewDrawerActions | null>(
    null
  );

  const value = useMemo(
    () => ({
      hasPreview,
      setHasPreview,
      previewContent,
      setPreviewContent,
      previewDrawerActions,
      setPreviewDrawerActions,
    }),
    [hasPreview, previewContent, previewDrawerActions]
  );

  return (
    <WorkspacePreviewRegistrationContext.Provider value={value}>
      {children}
    </WorkspacePreviewRegistrationContext.Provider>
  );
}

export function useWorkspacePreviewRegistration() {
  const ctx = useContext(WorkspacePreviewRegistrationContext);
  if (!ctx) {
    throw new Error(
      "useWorkspacePreviewRegistration must be used within WorkspacePreviewRegistrationProvider"
    );
  }
  return ctx;
}

/** Register live preview availability with the persistent app shell. */
export function useRegisterWorkspacePreview(hasPreview: boolean, preview?: ReactNode) {
  const ctx = useContext(WorkspacePreviewRegistrationContext);
  const setHasPreview = ctx?.setHasPreview;
  const setPreviewContent = ctx?.setPreviewContent;

  useLayoutEffect(() => {
    if (!setHasPreview) return;
    setHasPreview(hasPreview);
    return () => setHasPreview(false);
  }, [hasPreview, setHasPreview]);

  useLayoutEffect(() => {
    if (!setPreviewContent) return;
    setPreviewContent(hasPreview ? (preview ?? null) : null);
    return () => setPreviewContent(null);
  }, [hasPreview, preview, setPreviewContent]);
}

/** Register share/download handlers for the mobile preview drawer header. */
export function useRegisterPreviewDrawerActions(actions: PreviewDrawerActions | null) {
  const ctx = useContext(WorkspacePreviewRegistrationContext);
  const setPreviewDrawerActions = ctx?.setPreviewDrawerActions;

  useLayoutEffect(() => {
    if (!setPreviewDrawerActions) return;
    setPreviewDrawerActions(actions);
    return () => setPreviewDrawerActions(null);
  }, [actions, setPreviewDrawerActions]);
}

export function usePreviewDrawerActionsOptional(): PreviewDrawerActions | null {
  return useContext(WorkspacePreviewRegistrationContext)?.previewDrawerActions ?? null;
}
