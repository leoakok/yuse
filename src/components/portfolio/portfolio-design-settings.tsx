"use client";

import { useState, type ReactNode } from "react";
import type { PortfolioLayout } from "@/lib/types/portfolio";
import { updatePortfolioSettings } from "@/lib/api/portfolio-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PortfolioDesignSettingsProps {
  portfolioId: string;
  themeName: string;
  layout: PortfolioLayout;
  savedLayout: PortfolioLayout;
  accentColor: string;
  savedAccentColor: string;
  showPhoto?: boolean;
  savedShowPhoto?: boolean;
  onLayoutChange: (layout: PortfolioLayout) => void;
  onAccentColorChange: (color: string) => void;
  onShowPhotoChange?: (showPhoto: boolean) => void;
  onSaved?: (settings: { layout: PortfolioLayout; accentColor: string; showPhoto: boolean }) => void;
}

const ACCENT_PRESETS = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#ea580c", "#0f172a"];

const LAYOUT_OPTIONS: { id: PortfolioLayout; label: string }[] = [
  { id: "SINGLE", label: "Single" },
  { id: "SPLIT", label: "Split" },
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
  layout,
  savedLayout,
  accentColor,
  savedAccentColor,
  showPhoto = false,
  savedShowPhoto = false,
  onLayoutChange,
  onAccentColorChange,
  onShowPhotoChange = () => {},
  onSaved,
}: PortfolioDesignSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    layout !== savedLayout ||
    accentColor !== savedAccentColor ||
    showPhoto !== savedShowPhoto;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updatePortfolioSettings(portfolioId, { layout, accentColor, showPhoto });
      setSaved(true);
      onSaved?.({ layout, accentColor, showPhoto });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <DesignBlock title="Theme">
        <p className="text-sm font-medium">{themeName}</p>
      </DesignBlock>

      <DesignBlock title="Layout">
        <div className="space-y-3">
          <OptionPills options={LAYOUT_OPTIONS} value={layout} onChange={onLayoutChange} />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showPhoto}
              onChange={(e) => onShowPhotoChange(e.target.checked)}
              className="size-3.5 rounded border"
            />
            Show photo
          </label>
        </div>
      </DesignBlock>

      <DesignBlock title="Accent">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Accent ${preset}`}
              onClick={() => onAccentColorChange(preset)}
              className={cn(
                "size-7 rounded-full ring-offset-2 transition-transform hover:scale-110",
                accentColor === preset && "ring-2 ring-primary"
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
          <Input
            type="color"
            value={accentColor}
            onChange={(e) => onAccentColorChange(e.target.value)}
            className="h-7 w-12 cursor-pointer p-0.5"
          />
        </div>
      </DesignBlock>

      {dirty || saved ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          {saved && !dirty ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          <Button size="sm" onClick={() => void handleSave()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
