"use client";

import { useState, type ReactNode } from "react";
import type { ItemTitleLayout, PageFormat } from "@/lib/types/cv";
import { DEFAULT_PAGE_MARGIN_MM, marginPresetValues, PAGE_FORMATS, snapMarginMm } from "@/lib/cv/page-format";
import {
  DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  type CvTypographySettings,
} from "@/lib/cv/typography";
import { updateResumeSettings } from "@/lib/api/cv-api";
import { DiscreteSlider } from "@/components/cv/discrete-slider";
import { TypographySizeControl } from "@/components/cv/typography-size-control";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResumeDesignSettingsProps {
  resumeId: string;
  themeName: string;
  pageFormat: PageFormat;
  savedPageFormat: PageFormat;
  showPhoto?: boolean;
  savedShowPhoto?: boolean;
  marginHorizontalMm?: number;
  marginVerticalMm?: number;
  savedMarginHorizontalMm?: number;
  savedMarginVerticalMm?: number;
  itemTitleLayout?: ItemTitleLayout;
  savedItemTitleLayout?: ItemTitleLayout;
  typography?: CvTypographySettings;
  savedTypography?: CvTypographySettings;
  onPageFormatChange: (format: PageFormat) => void;
  onShowPhotoChange?: (showPhoto: boolean) => void;
  onItemTitleLayoutChange?: (layout: ItemTitleLayout) => void;
  onMarginHorizontalChange?: (value: number) => void;
  onMarginVerticalChange?: (value: number) => void;
  onTypographyChange?: (settings: CvTypographySettings) => void;
  onSaved?: (settings: {
    pageFormat: PageFormat;
    showPhoto: boolean;
    itemTitleLayout: ItemTitleLayout;
    marginHorizontalMm: number;
    marginVerticalMm: number;
    typography: CvTypographySettings;
  }) => void;
}

const MARGIN_STEPS = marginPresetValues().map((mm) => ({ value: mm }));

const PAGE_SIZE_OPTIONS = PAGE_FORMATS.map((f) => ({
  id: f.id,
  label: f.id === "LETTER" ? "US Letter" : f.label,
}));

const ITEM_TITLE_LAYOUT_OPTIONS: { id: ItemTitleLayout; label: string }[] = [
  { id: "STACKED", label: "Stacked" },
  { id: "INLINE", label: "Same line" },
];

const TYPOGRAPHY_CONTROLS: { key: keyof CvTypographySettings; label: string }[] = [
  { key: "fontSize", label: "Base font" },
  { key: "contactNameFontSize", label: "Full name" },
  { key: "contactHeadlineFontSize", label: "Headline" },
  { key: "contactDetailsFontSize", label: "Contact" },
  { key: "sectionTitleFontSize", label: "Section headings" },
  { key: "itemTitleFontSize", label: "Entry header" },
  { key: "itemMetaFontSize", label: "Meta" },
];

function typographyDirty(current: CvTypographySettings, saved: CvTypographySettings): boolean {
  return TYPOGRAPHY_CONTROLS.some(({ key }) => current[key] !== saved[key]);
}

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

function MarginControl({
  label,
  valueMm,
  onChange,
}: {
  label: string;
  valueMm: number;
  onChange: (mm: number) => void;
}) {
  const snapped = snapMarginMm(valueMm);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold leading-none">{label}</span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{snapped} mm</span>
      </div>
      <DiscreteSlider steps={MARGIN_STEPS} value={snapped} onChange={onChange} />
    </div>
  );
}

export function ResumeDesignSettings({
  resumeId,
  themeName,
  pageFormat,
  savedPageFormat,
  showPhoto = false,
  savedShowPhoto = false,
  marginHorizontalMm = DEFAULT_PAGE_MARGIN_MM,
  marginVerticalMm = DEFAULT_PAGE_MARGIN_MM,
  savedMarginHorizontalMm = DEFAULT_PAGE_MARGIN_MM,
  savedMarginVerticalMm = DEFAULT_PAGE_MARGIN_MM,
  itemTitleLayout = "STACKED",
  savedItemTitleLayout = "STACKED",
  typography = DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  savedTypography = DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  onPageFormatChange,
  onShowPhotoChange = () => {},
  onItemTitleLayoutChange = () => {},
  onMarginHorizontalChange = () => {},
  onMarginVerticalChange = () => {},
  onTypographyChange = () => {},
  onSaved,
}: ResumeDesignSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    pageFormat !== savedPageFormat ||
    showPhoto !== savedShowPhoto ||
    itemTitleLayout !== savedItemTitleLayout ||
    marginHorizontalMm !== savedMarginHorizontalMm ||
    marginVerticalMm !== savedMarginVerticalMm ||
    typographyDirty(typography, savedTypography);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateResumeSettings(resumeId, {
        pageFormat,
        showPhoto,
        itemTitleLayout,
        marginHorizontalMm,
        marginVerticalMm,
        ...typography,
      });
      setSaved(true);
      onSaved?.({
        pageFormat,
        showPhoto,
        itemTitleLayout,
        marginHorizontalMm,
        marginVerticalMm,
        typography,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <DesignBlock title="Theme">
        <p className="text-sm font-medium">{themeName}</p>
      </DesignBlock>

      <DesignBlock title="Page">
        <div className="space-y-3">
          <OptionPills
            options={PAGE_SIZE_OPTIONS}
            value={pageFormat}
            onChange={onPageFormatChange}
          />
          <MarginControl
            label="Horizontal"
            valueMm={marginHorizontalMm}
            onChange={(v) => {
              onMarginHorizontalChange(v);
              setSaved(false);
            }}
          />
          <MarginControl
            label="Vertical"
            valueMm={marginVerticalMm}
            onChange={(v) => {
              onMarginVerticalChange(v);
              setSaved(false);
            }}
          />
        </div>
      </DesignBlock>

      <DesignBlock title="Type">
        <div className="space-y-4">
          {TYPOGRAPHY_CONTROLS.map(({ key, label }) => (
            <TypographySizeControl
              key={key}
              label={label}
              settingKey={key}
              value={typography[key]}
              typography={typography}
              onChange={(next) => {
                onTypographyChange({ ...typography, [key]: next });
                setSaved(false);
              }}
            />
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Layout">
        <div className="space-y-3">
          <OptionPills
            options={ITEM_TITLE_LAYOUT_OPTIONS}
            value={itemTitleLayout}
            onChange={(id) => {
              onItemTitleLayoutChange(id);
              setSaved(false);
            }}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showPhoto}
              onChange={(event) => {
                onShowPhotoChange(event.target.checked);
                setSaved(false);
              }}
              className="size-3.5 rounded border"
            />
            Show photo
          </label>
        </div>
      </DesignBlock>

      {dirty || saved ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          {saved && !dirty ? (
            <span className="text-xs text-muted-foreground">Saved</span>
          ) : null}
          <Button size="sm" onClick={() => void handleSave()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
