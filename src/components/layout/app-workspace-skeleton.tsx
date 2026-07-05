"use client";

import { useCallback, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResumeWorkspaceToolbar,
  type ResumeWorkspaceMode,
} from "@/components/cv/resume-workspace-toolbar";
import {
  PortfolioWorkspaceToolbar,
  ResumeCustomizeHeader,
  type PortfolioWorkspaceMode,
} from "@/components/portfolio/portfolio-workspace-toolbar";
import {
  WorkspacePanel,
  WorkspacePanelBody,
} from "@/components/layout/workspace-panel";
import { ResumeDesignSettings } from "@/components/cv/resume-design-settings";
import {
  PortfolioDesignSettings,
  portfolioDesignSnapshotFromSettings,
  type PortfolioDesignSnapshot,
} from "@/components/portfolio/portfolio-design-settings";
import { pickResumeDesignExtension } from "@/lib/cv/resume-design";
import { defaultResumeSettings } from "@/lib/cv/resume-settings";
import { DEFAULT_CV_TYPOGRAPHY_SETTINGS } from "@/lib/cv/typography";
import type { ResumeSettings } from "@/lib/types/cv";
import type { PortfolioSettings } from "@/lib/types/portfolio";

function EditorPanelBodyPlaceholder() {
  return (
    <div
      className="min-h-[12rem] flex-1"
      aria-busy="true"
      aria-label="Loading sections"
    />
  );
}

function PreviewPanelPlaceholder() {
  return (
    <div
      className="h-full min-h-0 bg-muted/20"
      aria-busy="true"
      aria-label="Loading preview"
    />
  );
}

function ResumeEditorDesignPlaceholder({ resumeId }: { resumeId: string }) {
  const [settings, setSettings] = useState(() => defaultResumeSettings(resumeId));

  const patch = useCallback((next: Partial<ResumeSettings>) => {
    setSettings((current) => ({ ...current, ...next }));
  }, []);

  const typography = {
    fontSize: settings.fontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.fontSize,
    contactNameFontSize:
      settings.contactNameFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactNameFontSize,
    contactHeadlineFontSize:
      settings.contactHeadlineFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactHeadlineFontSize,
    contactDetailsFontSize:
      settings.contactDetailsFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactDetailsFontSize,
    sectionTitleFontSize:
      settings.sectionTitleFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.sectionTitleFontSize,
    itemTitleFontSize:
      settings.itemTitleFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.itemTitleFontSize,
    itemMetaFontSize:
      settings.itemMetaFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.itemMetaFontSize,
  };
  const designExtension = pickResumeDesignExtension(settings);

  return (
    <ResumeDesignSettings
      resumeId={resumeId}
      themeName="Modern"
      pageFormat={settings.pageFormat ?? "A4"}
      savedPageFormat={settings.pageFormat ?? "A4"}
      showPhoto={settings.showPhoto}
      savedShowPhoto={settings.showPhoto}
      marginHorizontalMm={settings.marginHorizontalMm}
      marginVerticalMm={settings.marginVerticalMm}
      savedMarginHorizontalMm={settings.marginHorizontalMm}
      savedMarginVerticalMm={settings.marginVerticalMm}
      itemTitleLayout={settings.itemTitleLayout}
      savedItemTitleLayout={settings.itemTitleLayout}
      itemTitleSeparator={settings.itemTitleSeparator}
      savedItemTitleSeparator={settings.itemTitleSeparator}
      itemTitleOrder={settings.itemTitleOrder}
      savedItemTitleOrder={settings.itemTitleOrder}
      fontFamily={settings.fontFamily}
      savedFontFamily={settings.fontFamily}
      accentColor={settings.accentColor}
      savedAccentColor={settings.accentColor}
      sectionDividerStyle={settings.sectionDividerStyle}
      savedSectionDividerStyle={settings.sectionDividerStyle}
      dateFormat={settings.dateFormat}
      savedDateFormat={settings.dateFormat}
      datePosition={settings.datePosition}
      savedDatePosition={settings.datePosition}
      skillsLayout={settings.skillsLayout}
      savedSkillsLayout={settings.skillsLayout}
      atsMode={settings.atsMode}
      savedAtsMode={settings.atsMode}
      columnLayout={settings.columnLayout}
      savedColumnLayout={settings.columnLayout}
      sidebarPosition={settings.sidebarPosition}
      savedSidebarPosition={settings.sidebarPosition}
      sidebarWidth={settings.sidebarWidth}
      savedSidebarWidth={settings.sidebarWidth}
      designPresetId={settings.designPresetId}
      savedDesignPresetId={settings.designPresetId}
      photoPosition={settings.photoPosition}
      savedPhotoPosition={settings.photoPosition}
      photoSize={settings.photoSize}
      savedPhotoSize={settings.photoSize}
      contactLayout={settings.contactLayout}
      savedContactLayout={settings.contactLayout}
      contactFields={settings.contactFields}
      savedContactFields={settings.contactFields}
      typography={typography}
      savedTypography={typography}
      designExtension={designExtension}
      savedDesignExtension={designExtension}
      onPageFormatChange={(pageFormat) => patch({ pageFormat })}
      onShowPhotoChange={(showPhoto) => patch({ showPhoto })}
      onItemTitleLayoutChange={(itemTitleLayout) => patch({ itemTitleLayout })}
      onItemTitleSeparatorChange={(itemTitleSeparator) => patch({ itemTitleSeparator })}
      onItemTitleOrderChange={(itemTitleOrder) => patch({ itemTitleOrder })}
      onFontFamilyChange={(fontFamily) => patch({ fontFamily })}
      onAccentColorChange={(accentColor) => patch({ accentColor })}
      onSectionDividerStyleChange={(sectionDividerStyle) => patch({ sectionDividerStyle })}
      onDateFormatChange={(dateFormat) => patch({ dateFormat })}
      onDatePositionChange={(datePosition) => patch({ datePosition })}
      onSkillsLayoutChange={(skillsLayout) => patch({ skillsLayout })}
      onAtsModeChange={(atsMode) => patch({ atsMode })}
      onColumnLayoutChange={(columnLayout) => patch({ columnLayout })}
      onSidebarPositionChange={(sidebarPosition) => patch({ sidebarPosition })}
      onSidebarWidthChange={(sidebarWidth) => patch({ sidebarWidth })}
      onDesignPresetChange={(designPresetId) => patch({ designPresetId })}
      onPhotoPositionChange={(photoPosition) => patch({ photoPosition })}
      onPhotoSizeChange={(photoSize) => patch({ photoSize })}
      onContactLayoutChange={(contactLayout) => patch({ contactLayout })}
      onContactFieldsChange={(contactFields) => patch({ contactFields })}
      onTypographyChange={(next) => patch(next)}
      onDesignExtensionChange={(next) => patch(next)}
      onMarginHorizontalChange={(marginHorizontalMm) => patch({ marginHorizontalMm })}
      onMarginVerticalChange={(marginVerticalMm) => patch({ marginVerticalMm })}
    />
  );
}

function PortfolioEditorDesignPlaceholder({ portfolioId }: { portfolioId: string }) {
  const [snapshot, setSnapshot] = useState<PortfolioDesignSnapshot>(() =>
    portfolioDesignSnapshotFromSettings({} as PortfolioSettings)
  );

  return (
    <PortfolioDesignSettings
      portfolioId={portfolioId}
      themeName="Default"
      snapshot={snapshot}
      savedSnapshot={snapshot}
      onChange={(patch) => setSnapshot((current) => ({ ...current, ...patch }))}
    />
  );
}

export function ResumeEditorLoadingShell({ resumeId }: { resumeId: string }) {
  const [mode, setMode] = useState<ResumeWorkspaceMode>("sections");

  return (
    <WorkspacePanel>
      <WorkspacePanelBody>
        <ScrollArea className="min-h-0 flex-1">
          <ResumeWorkspaceToolbar
            mode={mode}
            onModeChange={setMode}
            actionsDisabled
          />
          {mode === "design" ? (
            <ResumeEditorDesignPlaceholder resumeId={resumeId} />
          ) : (
            <EditorPanelBodyPlaceholder />
          )}
        </ScrollArea>
      </WorkspacePanelBody>
    </WorkspacePanel>
  );
}

export function PortfolioEditorLoadingShell({ portfolioId }: { portfolioId: string }) {
  const [mode, setMode] = useState<PortfolioWorkspaceMode>("content");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortfolioWorkspaceToolbar
        mode={mode}
        onModeChange={setMode}
        actionsDisabled
      />
      <ScrollArea className="min-h-0 flex-1">
        {mode === "design" ? (
          <PortfolioEditorDesignPlaceholder portfolioId={portfolioId} />
        ) : (
          <EditorPanelBodyPlaceholder />
        )}
      </ScrollArea>
    </div>
  );
}

export function ResumeCustomizeLoadingShell({
  resumeId,
  title,
}: {
  resumeId: string;
  title?: string;
}) {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <ResumeCustomizeHeader resumeId={resumeId} title={title} />
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <EditorPanelBodyPlaceholder />
        <PreviewPanelPlaceholder />
      </div>
    </div>
  );
}
