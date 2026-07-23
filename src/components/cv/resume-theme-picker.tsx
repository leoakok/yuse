"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import type { DesignPresetId, PageFormat, ResumeWithContent } from "@/lib/types/cv";
import {
  DESIGN_PRESET_OPTIONS,
  dispatchDesignPreset,
  dispatchResumeSettings,
  getDesignPresetLabel,
  type DesignPresetChangeHandlers,
} from "@/lib/cv/design-presets";
import { buildThemePreviewContent } from "@/lib/cv/theme-preview-content";
import { getPageSizePx } from "@/lib/cv/page-format";
import { fetchPublicThemes } from "@/lib/design/public-api";
import { CvPreview } from "@/components/cv/cv-preview";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import type { CuratedTheme } from "@/lib/types/design-share";
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
  title,
  description,
  content,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  content: ResumeWithContent;
  selected: boolean;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageFormat = content.settings.pageFormat ?? "A4";
  const scale = useFitToContainerScale(containerRef, pageFormat);

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
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function PresetThemePreviewCard({
  presetId,
  selected,
  onSelect,
}: {
  presetId: DesignPresetId;
  selected: boolean;
  onSelect: () => void;
}) {
  const option = DESIGN_PRESET_OPTIONS.find((entry) => entry.id === presetId);
  return (
    <ThemePreviewCard
      title={option?.label ?? presetId}
      description={option?.description ?? "Resume theme"}
      content={buildThemePreviewContent(presetId)}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

export function ResumeThemePicker({
  designPresetId,
  ...handlers
}: ResumeThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [publicThemes, setPublicThemes] = useState<CuratedTheme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [selectedCuratedId, setSelectedCuratedId] = useState<string | null>(null);

  const currentLabel = getDesignPresetLabel(designPresetId);
  const currentDescription =
    DESIGN_PRESET_OPTIONS.find((option) => option.id === designPresetId)?.description ??
    "Resume theme";

  useEffect(() => {
    if (!open) return;
    setLoadingThemes(true);
    void fetchPublicThemes()
      .then(setPublicThemes)
      .finally(() => setLoadingThemes(false));
  }, [open]);

  function handleSelectPreset(presetId: DesignPresetId) {
    setSelectedCuratedId(null);
    dispatchDesignPreset(presetId, handlers);
    setOpen(false);
  }

  function handleSelectCurated(theme: CuratedTheme) {
    setSelectedCuratedId(theme.id);
    dispatchResumeSettings(theme.preview.settings, handlers);
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
            {loadingThemes ? (
              <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading featured designs...
              </div>
            ) : null}

            {publicThemes.length > 0 ? (
              <div className="mb-8 space-y-3">
                <p className="text-sm font-medium">Featured designs</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {publicThemes.map((theme) => (
                    <ThemePreviewCard
                      key={theme.id}
                      title={theme.title}
                      description={theme.tags.join(", ") || "Featured design"}
                      content={theme.preview}
                      selected={selectedCuratedId === theme.id}
                      onSelect={() => handleSelectCurated(theme)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-sm font-medium">Built-in presets</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {DESIGN_PRESET_OPTIONS.map((option) => (
                  <PresetThemePreviewCard
                    key={option.id}
                    presetId={option.id}
                    selected={selectedCuratedId === null && designPresetId === option.id}
                    onSelect={() => handleSelectPreset(option.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
