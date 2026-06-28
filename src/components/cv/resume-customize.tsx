"use client";

import Link from "next/link";
import { useState } from "react";
import type { PageFormat, ResumeWithContent } from "@/lib/types/cv";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { resumePath } from "@/lib/cv/routes";
import { ResumeDesignSettings } from "@/components/cv/resume-design-settings";
import { CvPreview } from "@/components/cv/cv-preview";
import { buttonVariants } from "@/components/ui/button";

interface ResumeCustomizeProps {
  content: ResumeWithContent;
}

function initialMargin(value: number | undefined): number {
  return value ?? DEFAULT_PAGE_MARGIN_MM;
}

export function ResumeCustomize({ content }: ResumeCustomizeProps) {
  const [pageFormat, setPageFormat] = useState<PageFormat>(
    content.settings.pageFormat ?? "A4"
  );
  const [savedPageFormat, setSavedPageFormat] = useState<PageFormat>(
    content.settings.pageFormat ?? "A4"
  );
  const [marginHorizontalMm, setMarginHorizontalMm] = useState(
    initialMargin(content.settings.marginHorizontalMm)
  );
  const [marginVerticalMm, setMarginVerticalMm] = useState(
    initialMargin(content.settings.marginVerticalMm)
  );
  const [savedMarginHorizontalMm, setSavedMarginHorizontalMm] = useState(
    initialMargin(content.settings.marginHorizontalMm)
  );
  const [savedMarginVerticalMm, setSavedMarginVerticalMm] = useState(
    initialMargin(content.settings.marginVerticalMm)
  );
  const [showPhoto, setShowPhoto] = useState(content.settings.showPhoto);
  const [savedShowPhoto, setSavedShowPhoto] = useState(content.settings.showPhoto);

  const previewContent: ResumeWithContent = {
    ...content,
    settings: {
      ...content.settings,
      pageFormat,
      marginHorizontalMm,
      marginVerticalMm,
      showPhoto,
    },
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Customize style</h1>
          <p className="text-sm text-muted-foreground">
            {content.resume.title} — page layout and style options
          </p>
        </div>
        <Link
          href={resumePath(content.resume.id)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to resume
        </Link>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ResumeDesignSettings
          resumeId={content.resume.id}
          themeName={content.theme.name}
          pageFormat={pageFormat}
          savedPageFormat={savedPageFormat}
          showPhoto={showPhoto}
          savedShowPhoto={savedShowPhoto}
          marginHorizontalMm={marginHorizontalMm}
          marginVerticalMm={marginVerticalMm}
          savedMarginHorizontalMm={savedMarginHorizontalMm}
          savedMarginVerticalMm={savedMarginVerticalMm}
          onPageFormatChange={setPageFormat}
          onShowPhotoChange={setShowPhoto}
          onMarginHorizontalChange={setMarginHorizontalMm}
          onMarginVerticalChange={setMarginVerticalMm}
          onSaved={({ pageFormat: format, showPhoto: nextShowPhoto, marginHorizontalMm: h, marginVerticalMm: v }) => {
            setSavedPageFormat(format);
            setSavedShowPhoto(nextShowPhoto);
            setSavedMarginHorizontalMm(h);
            setSavedMarginVerticalMm(v);
          }}
        />

        <div className="flex min-h-0 flex-col rounded-lg border bg-muted/10">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-foreground">Actual page dimensions</p>
          </div>
          <div className="flex flex-1 justify-center overflow-auto p-4">
            <CvPreview content={previewContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
