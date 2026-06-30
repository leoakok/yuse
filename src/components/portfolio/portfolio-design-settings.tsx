"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import type {
  PortfolioAnimationLevel,
  PortfolioHeroStyle,
  PortfolioLayout,
  PortfolioNavigationStyle,
  PortfolioProjectCardStyle,
  PortfolioProjectGridColumns,
  PortfolioSettings,
  PortfolioTypographyScale,
} from "@/lib/types/portfolio";
import { updatePortfolioSettings } from "@/lib/api/portfolio-api";
import { useDebouncedAutoSave } from "@/lib/hooks/use-debounced-auto-save";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PortfolioDesignSnapshot = Pick<
  PortfolioSettings,
  | "layout"
  | "accentColor"
  | "showPhoto"
  | "projectGridColumns"
  | "projectCardStyle"
  | "typographyScale"
  | "heroStyle"
  | "navigationStyle"
  | "animationLevel"
>;

interface PortfolioDesignSettingsProps {
  portfolioId: string;
  themeName: string;
  snapshot: PortfolioDesignSnapshot;
  savedSnapshot: PortfolioDesignSnapshot;
  onChange: (patch: Partial<PortfolioDesignSnapshot>) => void;
  onSaved?: (settings: PortfolioDesignSnapshot) => void;
}

const ACCENT_PRESETS = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#ea580c", "#0f172a"];

const LAYOUT_OPTIONS: { id: PortfolioLayout; label: string }[] = [
  { id: "SINGLE", label: "Single" },
  { id: "SPLIT", label: "Split" },
];

const GRID_OPTIONS: { id: PortfolioProjectGridColumns; label: string }[] = [
  { id: "ONE", label: "1 col" },
  { id: "TWO", label: "2 col" },
  { id: "THREE", label: "3 col" },
];

const CARD_OPTIONS: { id: PortfolioProjectCardStyle; label: string }[] = [
  { id: "STANDARD", label: "Card" },
  { id: "MINIMAL", label: "Minimal" },
  { id: "IMAGE", label: "Image" },
];

const TYPE_OPTIONS: { id: PortfolioTypographyScale; label: string }[] = [
  { id: "COMPACT", label: "Compact" },
  { id: "NORMAL", label: "Normal" },
  { id: "SPACIOUS", label: "Spacious" },
];

const HERO_OPTIONS: { id: PortfolioHeroStyle; label: string }[] = [
  { id: "GRADIENT", label: "Gradient" },
  { id: "MINIMAL", label: "Minimal" },
  { id: "CENTERED", label: "Centered" },
];

const NAV_OPTIONS: { id: PortfolioNavigationStyle; label: string }[] = [
  { id: "NONE", label: "None" },
  { id: "TOP", label: "Top" },
  { id: "STICKY", label: "Sticky" },
];

const ANIMATION_OPTIONS: { id: PortfolioAnimationLevel; label: string }[] = [
  { id: "NONE", label: "None" },
  { id: "SUBTLE", label: "Subtle" },
  { id: "FULL", label: "Full" },
];

function DesignBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <h2 className="mb-2.5 text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function OptionPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
              selected
                ? "border-primary bg-primary/5 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PortfolioDesignSettings({
  portfolioId,
  themeName,
  snapshot,
  savedSnapshot,
  onChange,
  onSaved,
}: PortfolioDesignSettingsProps) {
  const dirty = JSON.stringify(snapshot) !== JSON.stringify(savedSnapshot);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const persist = useCallback(async () => {
    const current = snapshotRef.current;
    await updatePortfolioSettings(portfolioId, current);
    onSaved?.(current);
  }, [portfolioId, onSaved]);

  const { status } = useDebouncedAutoSave({
    isDirty: dirty,
    debounceKey: JSON.stringify(snapshot),
    save: persist,
  });

  useEffect(() => {
    if (status === "error") {
      toast.error("Could not save design changes. Try again.");
    }
  }, [status]);

  return (
    <div className="space-y-3">
      <DesignBlock title="Theme">
        <p className="text-sm font-medium">{themeName}</p>
      </DesignBlock>

      <DesignBlock title="Layout">
        <div className="space-y-3">
          <OptionPills options={LAYOUT_OPTIONS} value={snapshot.layout} onChange={(v) => onChange({ layout: v })} />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={snapshot.showPhoto}
              onChange={(e) => onChange({ showPhoto: e.target.checked })}
              className="size-3.5 rounded border"
            />
            Show photo
          </label>
        </div>
      </DesignBlock>

      <DesignBlock title="Projects">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Grid columns</p>
            <OptionPills
              options={GRID_OPTIONS}
              value={snapshot.projectGridColumns}
              onChange={(v) => onChange({ projectGridColumns: v })}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Card style</p>
            <OptionPills
              options={CARD_OPTIONS}
              value={snapshot.projectCardStyle}
              onChange={(v) => onChange({ projectCardStyle: v })}
            />
          </div>
        </div>
      </DesignBlock>

      <DesignBlock title="Type">
        <OptionPills
          options={TYPE_OPTIONS}
          value={snapshot.typographyScale}
          onChange={(v) => onChange({ typographyScale: v })}
        />
      </DesignBlock>

      <DesignBlock title="Hero & navigation">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Hero</p>
            <OptionPills options={HERO_OPTIONS} value={snapshot.heroStyle} onChange={(v) => onChange({ heroStyle: v })} />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Navigation</p>
            <OptionPills
              options={NAV_OPTIONS}
              value={snapshot.navigationStyle}
              onChange={(v) => onChange({ navigationStyle: v })}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Animation</p>
            <OptionPills
              options={ANIMATION_OPTIONS}
              value={snapshot.animationLevel}
              onChange={(v) => onChange({ animationLevel: v })}
            />
          </div>
        </div>
      </DesignBlock>

      <DesignBlock title="Accent">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Accent ${preset}`}
              onClick={() => onChange({ accentColor: preset })}
              className={cn(
                "size-7 rounded-full ring-offset-2 transition-transform hover:scale-110",
                snapshot.accentColor === preset && "ring-2 ring-primary"
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
          <Input
            type="color"
            value={snapshot.accentColor}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="h-7 w-12 cursor-pointer p-0.5"
          />
        </div>
      </DesignBlock>
    </div>
  );
}

export function portfolioDesignSnapshotFromSettings(
  settings: PortfolioSettings
): PortfolioDesignSnapshot {
  return {
    layout: settings.layout ?? "SINGLE",
    accentColor: settings.accentColor ?? "#2563eb",
    showPhoto: settings.showPhoto ?? false,
    projectGridColumns: settings.projectGridColumns ?? "TWO",
    projectCardStyle: settings.projectCardStyle ?? "STANDARD",
    typographyScale: settings.typographyScale ?? "NORMAL",
    heroStyle: settings.heroStyle ?? "GRADIENT",
    navigationStyle: settings.navigationStyle ?? "TOP",
    animationLevel: settings.animationLevel ?? "SUBTLE",
  };
}
