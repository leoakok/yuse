"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ChevronsUpDown } from "lucide-react";
import type { DesignPresetId, PageFormat } from "@/lib/types/cv";
import {
  DESIGN_PRESET_OPTIONS,
  dispatchDesignPreset,
  getDesignPresetLabel,
  type DesignPresetChangeHandlers,
} from "@/lib/cv/design-presets";
import { buildThemePreviewContent } from "@/lib/cv/theme-preview-content";
import { getPageSizePx } from "@/lib/cv/page-format";
import { CvPreview } from "@/components/cv/cv-preview";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

interface ResumeThemePickerProps extends DesignPresetChangeHandlers {
  designPresetId: DesignPresetId;
}

function useFitToContainerScale(containerRef: RefObject<HTMLElement | null>, pageFormat: PageFormat) {
  const [scale, setScale] = useState(0.34);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pageSize = getPageSizePx(pageFormat);

    function updateScale() {
      const rect = container!.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = Math.min(rect.width / pageSize.width, rect.height / pageSize.height);
      setScale(next);
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, pageFormat]);

  return scale;
}

function ThemePreviewCard({
  presetId,
  selected,
  onSelect,
}: {
  presetId: DesignPresetId;
  selected: boolean;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const content = buildThemePreviewContent(presetId);
  const pageFormat = content.settings.pageFormat ?? "A4";
  const scale = useFitToContainerScale(containerRef, pageFormat);
  const option = DESIGN_PRESET_OPTIONS.find((entry) => entry.id === presetId);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div
        ref={containerRef}
        className="relative h-56 overflow-hidden border-b bg-muted/20 sm:h-64"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="origin-center" style={{ transform: `scale(${scale})` }}>
            <CvPreview
              content={content}
              className="shadow-none"
              singlePage
              interactive={false}
            />
          </div>
        </div>
      </div>
      <div className="space-y-0.5 px-3 py-3">
        <p className="text-sm font-medium">{option?.label ?? presetId}</p>
        <p className="text-xs text-muted-foreground">{option?.description}</p>
      </div>
    </button>
  );
}

export function ResumeThemePicker({
  designPresetId,
  ...handlers
}: ResumeThemePickerProps) {
  const [open, setOpen] = useState(false);

  const currentLabel = getDesignPresetLabel(designPresetId);
  const currentDescription =
    DESIGN_PRESET_OPTIONS.find((option) => option.id === designPresetId)?.description ??
    "Resume theme";

  function handleSelect(presetId: DesignPresetId) {
    dispatchDesignPreset(presetId, handlers);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{currentLabel}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {currentDescription}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent
          showCloseButton
          dialogClassName="flex h-[90dvh] max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
          sheetClassName="flex h-[90dvh] flex-col gap-0 overflow-hidden p-0"
          sheetBodyClassName="p-0"
        >
          <ResponsiveDialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
            <ResponsiveDialogTitle>Choose a theme</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Pick a starting look. You can fine tune fonts, colors, and layout afterward.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {DESIGN_PRESET_OPTIONS.map((option) => (
                <ThemePreviewCard
                  key={option.id}
                  presetId={option.id}
                  selected={designPresetId === option.id}
                  onSelect={() => handleSelect(option.id)}
                />
              ))}
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
