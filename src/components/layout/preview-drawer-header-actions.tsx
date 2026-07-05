"use client";

import { useMemo } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreviewDrawerActionsOptional } from "@/components/layout/workspace-preview-registration";
import { useDrawerShell, useRegisterDrawerShellHeader } from "@/components/ui/drawer-shell";

export interface PreviewDrawerHeaderActionsProps {
  onShare?: () => void;
  onDownload?: () => void | Promise<void>;
  isDownloading?: boolean;
  shareLabel?: string;
}

export function PreviewDrawerHeaderActions({
  onShare,
  onDownload,
  isDownloading = false,
  shareLabel = "Share",
}: PreviewDrawerHeaderActionsProps) {
  if (!onShare && !onDownload) {
    return null;
  }

  return (
    <>
      {onShare ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => onShare()}
          aria-label={shareLabel}
        >
          <Share2 />
        </Button>
      ) : null}
      {onDownload ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => void onDownload()}
          disabled={isDownloading}
          aria-label={isDownloading ? "Opening print view" : "Print or save as PDF"}
        >
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      ) : null}
    </>
  );
}

/** Registers share/download icon buttons in the mobile preview drawer header. */
export function useRegisterPreviewDrawerShellHeader() {
  const inDrawerShell = useDrawerShell();
  const previewActions = usePreviewDrawerActionsOptional();

  const drawerShellHeader = useMemo(() => {
    if (!inDrawerShell || !previewActions) {
      return null;
    }
    const { onShare, onDownload, isDownloading, shareLabel } = previewActions;
    if (!onShare && !onDownload) {
      return null;
    }
    return {
      actions: (
        <PreviewDrawerHeaderActions
          onShare={onShare}
          onDownload={onDownload}
          isDownloading={isDownloading}
          shareLabel={shareLabel}
        />
      ),
    };
  }, [inDrawerShell, previewActions]);

  useRegisterDrawerShellHeader(drawerShellHeader);
}
