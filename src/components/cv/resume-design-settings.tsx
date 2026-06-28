"use client";

import { useState } from "react";
import type { PageFormat } from "@/lib/types/cv";
import { DEFAULT_PAGE_MARGIN_MM, PAGE_FORMATS } from "@/lib/cv/page-format";
import { updateResumeSettings } from "@/lib/api/cv-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onPageFormatChange: (format: PageFormat) => void;
  onShowPhotoChange?: (showPhoto: boolean) => void;
  onMarginHorizontalChange?: (value: number) => void;
  onMarginVerticalChange?: (value: number) => void;
  onSaved?: (settings: {
    pageFormat: PageFormat;
    showPhoto: boolean;
    marginHorizontalMm: number;
    marginVerticalMm: number;
  }) => void;
}

const MARGIN_PRESETS_MM = [8, 10, 12, 15, 20, 25];

function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_MARGIN_MM;
  return Math.min(40, Math.max(0, Math.round(value * 10) / 10));
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
  onPageFormatChange,
  onShowPhotoChange = () => {},
  onMarginHorizontalChange = () => {},
  onMarginVerticalChange = () => {},
  onSaved,
}: ResumeDesignSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    pageFormat !== savedPageFormat ||
    showPhoto !== savedShowPhoto ||
    marginHorizontalMm !== savedMarginHorizontalMm ||
    marginVerticalMm !== savedMarginVerticalMm;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateResumeSettings(resumeId, {
        pageFormat,
        showPhoto,
        marginHorizontalMm,
        marginVerticalMm,
      });
      setSaved(true);
      onSaved?.({ pageFormat, showPhoto, marginHorizontalMm, marginVerticalMm });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Theme</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The visual style applied to your resume preview.
        </p>
        <p className="mt-3 text-sm font-medium">{themeName}</p>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Page size</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose the paper format for your live preview and PDF export.
        </p>
        <div className="mt-4 grid gap-2">
          {PAGE_FORMATS.map((format) => {
            const selected = pageFormat === format.id;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => onPageFormatChange(format.id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <p className="text-sm font-medium">{format.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{format.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Page margins</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Horizontal and vertical margins in millimeters. Applies to preview and PDF export.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Horizontal</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={marginHorizontalMm}
                onChange={(event) => {
                  onMarginHorizontalChange(clampMargin(Number(event.target.value)));
                  setSaved(false);
                }}
              />
              <span className="text-xs text-muted-foreground">mm</span>
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Vertical</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={marginVerticalMm}
                onChange={(event) => {
                  onMarginVerticalChange(clampMargin(Number(event.target.value)));
                  setSaved(false);
                }}
              />
              <span className="text-xs text-muted-foreground">mm</span>
            </div>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MARGIN_PRESETS_MM.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onMarginHorizontalChange(preset);
                onMarginVerticalChange(preset);
                setSaved(false);
              }}
              className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
            >
              {preset} mm
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Profile photo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Show your profile photo in the resume header when a photo URL is set on your profile.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showPhoto}
            onChange={(event) => {
              onShowPhotoChange(event.target.checked);
              setSaved(false);
            }}
            className="size-4 rounded border"
          />
          Show photo in preview
        </label>
      </section>

      <section className="rounded-lg border border-dashed bg-muted/20 p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Coming soon</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>Font family and sizes</li>
          <li>Accent colors</li>
          <li>Section spacing</li>
        </ul>
      </section>

      {dirty || saved ? (
        <div className="flex items-center justify-end gap-2">
          {saved && !dirty ? (
            <p className="text-xs text-muted-foreground">Changes saved</p>
          ) : null}
          <Button size="sm" onClick={() => void handleSave()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
