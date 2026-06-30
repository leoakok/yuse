"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type {
  ColumnLayout,
  ContactField,
  ContactLayout,
  DateFormat,
  DatePosition,
  DesignPresetId,
  FontFamily,
  ItemTitleLayout,
  ItemTitleOrder,
  ItemTitleSeparator,
  PageFormat,
  PhotoPosition,
  PhotoSize,
  Section,
  SectionDividerStyle,
  SidebarPosition,
  SidebarWidth,
  SkillsLayout,
} from "@/lib/types/cv";
import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/cv/accent";
import { CONTACT_FIELD_OPTIONS, DEFAULT_CONTACT_FIELDS } from "@/lib/cv/contact-header";
import { getDesignPresetBundle } from "@/lib/cv/design-presets";
import { ResumeThemePicker } from "@/components/cv/resume-theme-picker";
import { DEFAULT_PHOTO_POSITION, DEFAULT_PHOTO_SIZE } from "@/lib/cv/photo";
import { DEFAULT_CV_FONT_FAMILY, CV_FONT_FAMILY_OPTIONS } from "@/lib/cv/fonts";
import { DEFAULT_PAGE_MARGIN_MM, marginPresetValues, PAGE_FORMATS, snapMarginMm } from "@/lib/cv/page-format";
import {
  DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  type CvTypographySettings,
} from "@/lib/cv/typography";
import {
  reorderResumeSections,
  updateResumeSectionDisplayTitle,
  updateResumeSectionVisibility,
  updateResumeSettings,
} from "@/lib/api/cv-api";
import {
  ResumeExportAtsSettings,
  ResumeSectionDepthSettings,
  ResumeSpacingItemsSettings,
  ResumeTypeDepthSettings,
} from "@/components/cv/resume-design-extension-panel";
import {
  DEFAULT_RESUME_DESIGN_EXTENSION,
  type ResumeDesignExtensionFields,
} from "@/lib/cv/resume-design";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DiscreteSlider } from "@/components/cv/discrete-slider";
import { TypographySizeControl } from "@/components/cv/typography-size-control";
import { useDebouncedAutoSave } from "@/lib/hooks/use-debounced-auto-save";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCENT_PRESETS = ["#c45c3e", "#2563eb", "#7c3aed", "#059669", "#0f172a"];

export interface ResumeDesignSnapshot {
  pageFormat: PageFormat;
  showPhoto: boolean;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  fontFamily: FontFamily;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  skillsLayout: SkillsLayout;
  atsMode: boolean;
  columnLayout: ColumnLayout;
  sidebarPosition: SidebarPosition;
  sidebarWidth: SidebarWidth;
  designPresetId: DesignPresetId;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  contactLayout: ContactLayout;
  contactFields: ContactField[];
  marginHorizontalMm: number;
  marginVerticalMm: number;
  typography: CvTypographySettings;
  designExtension: ResumeDesignExtensionFields;
}

export interface ResumeDesignSectionEntry {
  section: Section;
  showInPreview: boolean;
  displayTitle?: string | null;
}

interface ResumeDesignSettingsProps {
  resumeId: string;
  themeName: string;
  sections?: ResumeDesignSectionEntry[];
  onSectionsChange?: (sections: ResumeDesignSectionEntry[]) => void;
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
  itemTitleSeparator?: ItemTitleSeparator;
  savedItemTitleSeparator?: ItemTitleSeparator;
  itemTitleOrder?: ItemTitleOrder;
  savedItemTitleOrder?: ItemTitleOrder;
  fontFamily?: FontFamily;
  savedFontFamily?: FontFamily;
  accentColor?: string;
  savedAccentColor?: string;
  sectionDividerStyle?: SectionDividerStyle;
  savedSectionDividerStyle?: SectionDividerStyle;
  dateFormat?: DateFormat;
  savedDateFormat?: DateFormat;
  datePosition?: DatePosition;
  savedDatePosition?: DatePosition;
  skillsLayout?: SkillsLayout;
  savedSkillsLayout?: SkillsLayout;
  atsMode?: boolean;
  savedAtsMode?: boolean;
  columnLayout?: ColumnLayout;
  savedColumnLayout?: ColumnLayout;
  sidebarPosition?: SidebarPosition;
  savedSidebarPosition?: SidebarPosition;
  sidebarWidth?: SidebarWidth;
  savedSidebarWidth?: SidebarWidth;
  designPresetId?: DesignPresetId;
  savedDesignPresetId?: DesignPresetId;
  photoPosition?: PhotoPosition;
  savedPhotoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
  savedPhotoSize?: PhotoSize;
  contactLayout?: ContactLayout;
  savedContactLayout?: ContactLayout;
  contactFields?: ContactField[];
  savedContactFields?: ContactField[];
  typography?: CvTypographySettings;
  savedTypography?: CvTypographySettings;
  onPageFormatChange: (format: PageFormat) => void;
  onShowPhotoChange?: (showPhoto: boolean) => void;
  onItemTitleLayoutChange?: (layout: ItemTitleLayout) => void;
  onItemTitleSeparatorChange?: (separator: ItemTitleSeparator) => void;
  onItemTitleOrderChange?: (order: ItemTitleOrder) => void;
  onFontFamilyChange?: (fontFamily: FontFamily) => void;
  onAccentColorChange?: (color: string) => void;
  onSectionDividerStyleChange?: (style: SectionDividerStyle) => void;
  onDateFormatChange?: (format: DateFormat) => void;
  onDatePositionChange?: (position: DatePosition) => void;
  onSkillsLayoutChange?: (layout: SkillsLayout) => void;
  onAtsModeChange?: (enabled: boolean) => void;
  onColumnLayoutChange?: (layout: ColumnLayout) => void;
  onSidebarPositionChange?: (position: SidebarPosition) => void;
  onSidebarWidthChange?: (width: SidebarWidth) => void;
  onDesignPresetChange?: (presetId: DesignPresetId) => void;
  onPhotoPositionChange?: (position: PhotoPosition) => void;
  onPhotoSizeChange?: (size: PhotoSize) => void;
  onContactLayoutChange?: (layout: ContactLayout) => void;
  onContactFieldsChange?: (fields: ContactField[]) => void;
  onMarginHorizontalChange?: (value: number) => void;
  onMarginVerticalChange?: (value: number) => void;
  onTypographyChange?: (settings: CvTypographySettings) => void;
  designExtension?: ResumeDesignExtensionFields;
  savedDesignExtension?: ResumeDesignExtensionFields;
  onDesignExtensionChange?: (extension: ResumeDesignExtensionFields) => void;
  onSaved?: (settings: ResumeDesignSnapshot) => void;
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

const ITEM_TITLE_SEPARATOR_OPTIONS: { id: ItemTitleSeparator; label: string }[] = [
  { id: "DOT", label: "Dot" },
  { id: "PIPE", label: "Pipe" },
  { id: "COMMA", label: "Comma" },
];

const ITEM_TITLE_ORDER_OPTIONS: { id: ItemTitleOrder; label: string }[] = [
  { id: "TITLE_FIRST", label: "Title first" },
  { id: "COMPANY_FIRST", label: "Company first" },
];

const SECTION_DIVIDER_OPTIONS: { id: SectionDividerStyle; label: string }[] = [
  { id: "FULL", label: "Full width" },
  { id: "TEXT_WIDTH", label: "Under text" },
  { id: "NONE", label: "None" },
];

const DATE_FORMAT_OPTIONS: { id: DateFormat; label: string }[] = [
  { id: "MON_YYYY", label: "Jan 2024" },
  { id: "MM_YYYY", label: "01/2024" },
  { id: "YYYY", label: "2024" },
  { id: "ISO", label: "ISO" },
];

const DATE_POSITION_OPTIONS: { id: DatePosition; label: string }[] = [
  { id: "RIGHT", label: "Right" },
  { id: "BELOW", label: "Below" },
  { id: "INLINE", label: "Inline" },
];

const SKILLS_LAYOUT_OPTIONS: { id: SkillsLayout; label: string }[] = [
  { id: "LIST", label: "List" },
  { id: "TAGS", label: "Tags" },
  { id: "COLUMNS", label: "Columns" },
];

const SIDEBAR_POSITION_OPTIONS: { id: SidebarPosition; label: string }[] = [
  { id: "LEFT", label: "Left" },
  { id: "RIGHT", label: "Right" },
];

const SIDEBAR_WIDTH_OPTIONS: { id: SidebarWidth; label: string }[] = [
  { id: "NARROW", label: "Narrow" },
  { id: "MEDIUM", label: "Medium" },
  { id: "WIDE", label: "Wide" },
];

const PHOTO_POSITION_OPTIONS: { id: PhotoPosition; label: string }[] = [
  { id: "HEADER_LEFT", label: "Header left" },
  { id: "HEADER_RIGHT", label: "Header right" },
  { id: "SIDEBAR", label: "Sidebar" },
  { id: "NONE", label: "Hidden" },
];

const PHOTO_SIZE_OPTIONS: { id: PhotoSize; label: string }[] = [
  { id: "XS", label: "XS" },
  { id: "S", label: "S" },
  { id: "M", label: "M" },
  { id: "L", label: "L" },
  { id: "XL", label: "XL" },
];

const CONTACT_LAYOUT_OPTIONS: { id: ContactLayout; label: string }[] = [
  { id: "INLINE", label: "Inline" },
  { id: "STACKED", label: "Stacked" },
  { id: "ICON_LABEL", label: "Icons" },
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

function buildSnapshot(
  pageFormat: PageFormat,
  showPhoto: boolean,
  itemTitleLayout: ItemTitleLayout,
  itemTitleSeparator: ItemTitleSeparator,
  itemTitleOrder: ItemTitleOrder,
  fontFamily: FontFamily,
  accentColor: string,
  sectionDividerStyle: SectionDividerStyle,
  dateFormat: DateFormat,
  datePosition: DatePosition,
  skillsLayout: SkillsLayout,
  atsMode: boolean,
  columnLayout: ColumnLayout,
  sidebarPosition: SidebarPosition,
  sidebarWidth: SidebarWidth,
  designPresetId: DesignPresetId,
  photoPosition: PhotoPosition,
  photoSize: PhotoSize,
  contactLayout: ContactLayout,
  contactFields: ContactField[],
  marginHorizontalMm: number,
  marginVerticalMm: number,
  typography: CvTypographySettings,
  designExtension: ResumeDesignExtensionFields
): ResumeDesignSnapshot {
  return {
    pageFormat,
    showPhoto,
    itemTitleLayout,
    itemTitleSeparator,
    itemTitleOrder,
    fontFamily,
    accentColor,
    sectionDividerStyle,
    dateFormat,
    datePosition,
    skillsLayout,
    atsMode,
    columnLayout,
    sidebarPosition,
    sidebarWidth,
    designPresetId,
    photoPosition,
    photoSize,
    contactLayout,
    contactFields,
    marginHorizontalMm,
    marginVerticalMm,
    typography,
    designExtension,
  };
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
  themeName: _themeName,
  sections = [],
  onSectionsChange,
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
  itemTitleSeparator = "DOT",
  savedItemTitleSeparator = "DOT",
  itemTitleOrder = "TITLE_FIRST",
  savedItemTitleOrder = "TITLE_FIRST",
  fontFamily = DEFAULT_CV_FONT_FAMILY,
  savedFontFamily = DEFAULT_CV_FONT_FAMILY,
  accentColor = DEFAULT_RESUME_ACCENT_COLOR,
  savedAccentColor = DEFAULT_RESUME_ACCENT_COLOR,
  sectionDividerStyle = "FULL",
  savedSectionDividerStyle = "FULL",
  dateFormat = "MON_YYYY",
  savedDateFormat = "MON_YYYY",
  datePosition = "RIGHT",
  savedDatePosition = "RIGHT",
  skillsLayout = "LIST",
  savedSkillsLayout = "LIST",
  atsMode = false,
  savedAtsMode = false,
  columnLayout = "SINGLE",
  savedColumnLayout = "SINGLE",
  sidebarPosition = "LEFT",
  savedSidebarPosition = "LEFT",
  sidebarWidth = "MEDIUM",
  savedSidebarWidth = "MEDIUM",
  designPresetId = "MODERN",
  savedDesignPresetId = "MODERN",
  photoPosition = DEFAULT_PHOTO_POSITION,
  savedPhotoPosition = DEFAULT_PHOTO_POSITION,
  photoSize = DEFAULT_PHOTO_SIZE,
  savedPhotoSize = DEFAULT_PHOTO_SIZE,
  contactLayout = "INLINE",
  savedContactLayout = "INLINE",
  contactFields = DEFAULT_CONTACT_FIELDS,
  savedContactFields = DEFAULT_CONTACT_FIELDS,
  typography = DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  savedTypography = DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  onPageFormatChange,
  onShowPhotoChange = () => {},
  onItemTitleLayoutChange = () => {},
  onItemTitleSeparatorChange = () => {},
  onItemTitleOrderChange = () => {},
  onFontFamilyChange = () => {},
  onAccentColorChange = () => {},
  onSectionDividerStyleChange = () => {},
  onDateFormatChange = () => {},
  onDatePositionChange = () => {},
  onSkillsLayoutChange = () => {},
  onAtsModeChange = () => {},
  onColumnLayoutChange = () => {},
  onSidebarPositionChange = () => {},
  onSidebarWidthChange = () => {},
  onDesignPresetChange = () => {},
  onPhotoPositionChange = () => {},
  onPhotoSizeChange = () => {},
  onContactLayoutChange = () => {},
  onContactFieldsChange = () => {},
  onMarginHorizontalChange = () => {},
  onMarginVerticalChange = () => {},
  onTypographyChange = () => {},
  designExtension = DEFAULT_RESUME_DESIGN_EXTENSION,
  savedDesignExtension = DEFAULT_RESUME_DESIGN_EXTENSION,
  onDesignExtensionChange = () => {},
  onSaved,
}: ResumeDesignSettingsProps) {
  const [sectionBusyId, setSectionBusyId] = useState<string | null>(null);

  const dirty =
    pageFormat !== savedPageFormat ||
    showPhoto !== savedShowPhoto ||
    itemTitleLayout !== savedItemTitleLayout ||
    itemTitleSeparator !== savedItemTitleSeparator ||
    itemTitleOrder !== savedItemTitleOrder ||
    fontFamily !== savedFontFamily ||
    accentColor !== savedAccentColor ||
    sectionDividerStyle !== savedSectionDividerStyle ||
    dateFormat !== savedDateFormat ||
    datePosition !== savedDatePosition ||
    skillsLayout !== savedSkillsLayout ||
    atsMode !== savedAtsMode ||
    columnLayout !== savedColumnLayout ||
    sidebarPosition !== savedSidebarPosition ||
    sidebarWidth !== savedSidebarWidth ||
    designPresetId !== savedDesignPresetId ||
    photoPosition !== savedPhotoPosition ||
    photoSize !== savedPhotoSize ||
    contactLayout !== savedContactLayout ||
    JSON.stringify(contactFields) !== JSON.stringify(savedContactFields) ||
    marginHorizontalMm !== savedMarginHorizontalMm ||
    marginVerticalMm !== savedMarginVerticalMm ||
    typographyDirty(typography, savedTypography) ||
    JSON.stringify(designExtension) !== JSON.stringify(savedDesignExtension);

  const snapshot = buildSnapshot(
    pageFormat,
    showPhoto,
    itemTitleLayout,
    itemTitleSeparator,
    itemTitleOrder,
    fontFamily,
    accentColor,
    sectionDividerStyle,
    dateFormat,
    datePosition,
    skillsLayout,
    atsMode,
    columnLayout,
    sidebarPosition,
    sidebarWidth,
    designPresetId,
    photoPosition,
    photoSize,
    contactLayout,
    contactFields,
    marginHorizontalMm,
    marginVerticalMm,
    typography,
    designExtension
  );
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const persist = useCallback(async () => {
    const current = snapshotRef.current;
    await updateResumeSettings(resumeId, {
      pageFormat: current.pageFormat,
      themeId: getDesignPresetBundle(current.designPresetId).themeId,
      showPhoto: current.showPhoto,
      itemTitleLayout: current.itemTitleLayout,
      itemTitleSeparator: current.itemTitleSeparator,
      itemTitleOrder: current.itemTitleOrder,
      fontFamily: current.fontFamily,
      accentColor: current.accentColor,
      sectionDividerStyle: current.sectionDividerStyle,
      dateFormat: current.dateFormat,
      datePosition: current.datePosition,
      skillsLayout: current.skillsLayout,
      atsMode: current.atsMode,
      columnLayout: current.columnLayout,
      sidebarPosition: current.sidebarPosition,
      sidebarWidth: current.sidebarWidth,
      designPresetId: current.designPresetId,
      photoPosition: current.photoPosition,
      photoSize: current.photoSize,
      contactLayout: current.contactLayout,
      contactFields: current.contactFields,
      marginHorizontalMm: current.marginHorizontalMm,
      marginVerticalMm: current.marginVerticalMm,
      ...current.typography,
      ...current.designExtension,
    });
    onSaved?.(current);
  }, [resumeId, onSaved]);

  async function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length || sectionBusyId) return;
    const next = [...sections];
    const [entry] = next.splice(index, 1);
    next.splice(target, 0, entry);
    setSectionBusyId(entry.section.id);
    try {
      const updated = await reorderResumeSections(
        resumeId,
        next.map((row) => row.section.id)
      );
      onSectionsChange?.(
        updated.sections.map((row) => ({
          section: row.section,
          showInPreview: row.showInPreview,
          displayTitle: row.displayTitle,
        }))
      );
    } catch {
      toast.error("Could not reorder sections.");
    } finally {
      setSectionBusyId(null);
    }
  }

  async function toggleSectionVisibility(sectionId: string, showInPreview: boolean) {
    if (sectionBusyId) return;
    setSectionBusyId(sectionId);
    try {
      const updated = await updateResumeSectionVisibility(resumeId, sectionId, showInPreview);
      onSectionsChange?.(
        updated.sections.map((row) => ({
          section: row.section,
          showInPreview: row.showInPreview,
          displayTitle: row.displayTitle,
        }))
      );
    } catch {
      toast.error("Could not update section visibility.");
    } finally {
      setSectionBusyId(null);
    }
  }

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
    <Accordion defaultValue={["theme-preset"]} className="space-y-2">
      <AccordionItem value="theme-preset">
        <AccordionTrigger>Theme</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Theme</p>
              <ResumeThemePicker
                designPresetId={designPresetId}
                typography={typography}
                designExtension={designExtension}
                onDesignPresetChange={onDesignPresetChange}
                onFontFamilyChange={onFontFamilyChange}
                onAccentColorChange={onAccentColorChange}
                onSectionDividerStyleChange={onSectionDividerStyleChange}
                onItemTitleLayoutChange={onItemTitleLayoutChange}
                onItemTitleSeparatorChange={onItemTitleSeparatorChange}
                onItemTitleOrderChange={onItemTitleOrderChange}
                onColumnLayoutChange={onColumnLayoutChange}
                onSidebarPositionChange={onSidebarPositionChange}
                onSidebarWidthChange={onSidebarWidthChange}
                onContactLayoutChange={onContactLayoutChange}
                onSkillsLayoutChange={onSkillsLayoutChange}
                onDateFormatChange={onDateFormatChange}
                onDatePositionChange={onDatePositionChange}
                onTypographyChange={onTypographyChange}
                onDesignExtensionChange={onDesignExtensionChange}
              />
            </div>
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs text-muted-foreground">Accent</p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={`Accent ${preset}`}
                    onClick={() => onAccentColorChange(preset)}
                    className={cn(
                      "size-7 rounded-full border border-border",
                      accentColor === preset && "ring-2 ring-primary"
                    )}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => onAccentColorChange(e.target.value)}
                className="h-8 font-mono text-xs"
                aria-label="Accent color hex"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Section line</p>
              <OptionPills
                options={SECTION_DIVIDER_OPTIONS}
                value={sectionDividerStyle}
                onChange={onSectionDividerStyleChange}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="page-margins">
        <AccordionTrigger>Page and margins</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <OptionPills
              options={PAGE_SIZE_OPTIONS}
              value={pageFormat}
              onChange={onPageFormatChange}
            />
            <MarginControl
              label="Horizontal"
              valueMm={marginHorizontalMm}
              onChange={onMarginHorizontalChange}
            />
            <MarginControl
              label="Vertical"
              valueMm={marginVerticalMm}
              onChange={onMarginVerticalChange}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="typography">
        <AccordionTrigger>Typography</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Font</p>
              <OptionPills
                options={CV_FONT_FAMILY_OPTIONS}
                value={fontFamily}
                onChange={onFontFamilyChange}
              />
            </div>
            {TYPOGRAPHY_CONTROLS.map(({ key, label }) => (
              <TypographySizeControl
                key={key}
                label={label}
                settingKey={key}
                value={typography[key]}
                typography={typography}
                onChange={(next) => onTypographyChange({ ...typography, [key]: next })}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="layout">
        <AccordionTrigger>Layout</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Entry title layout</p>
              <OptionPills
                options={ITEM_TITLE_LAYOUT_OPTIONS}
                value={itemTitleLayout}
                onChange={onItemTitleLayoutChange}
              />
            </div>
            {itemTitleLayout === "INLINE" ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Separator</p>
                  <OptionPills
                    options={ITEM_TITLE_SEPARATOR_OPTIONS}
                    value={itemTitleSeparator}
                    onChange={onItemTitleSeparatorChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Order</p>
                  <OptionPills
                    options={ITEM_TITLE_ORDER_OPTIONS}
                    value={itemTitleOrder}
                    onChange={onItemTitleOrderChange}
                  />
                </div>
              </>
            ) : null}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showPhoto}
                onChange={(event) => onShowPhotoChange(event.target.checked)}
                className="size-3.5 rounded border"
              />
              Show photo
            </label>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Photo position</p>
              <OptionPills
                options={PHOTO_POSITION_OPTIONS}
                value={photoPosition}
                onChange={onPhotoPositionChange}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Photo size</p>
              <OptionPills
                options={PHOTO_SIZE_OPTIONS}
                value={photoSize}
                onChange={onPhotoSizeChange}
              />
            </div>
            {/* columnLayout (resume-wide sidebar) is not editable here; themes may still apply TWO_COLUMN. */}
            {columnLayout === "TWO_COLUMN" ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Sidebar side</p>
                  <OptionPills
                    options={SIDEBAR_POSITION_OPTIONS}
                    value={sidebarPosition}
                    onChange={onSidebarPositionChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Sidebar width</p>
                  <OptionPills
                    options={SIDEBAR_WIDTH_OPTIONS}
                    value={sidebarWidth}
                    onChange={onSidebarWidthChange}
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Contact layout</p>
              <OptionPills
                options={CONTACT_LAYOUT_OPTIONS}
                value={contactLayout}
                onChange={onContactLayoutChange}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Contact fields</p>
              <div className="flex flex-wrap gap-1.5">
                {CONTACT_FIELD_OPTIONS.map((field) => {
                  const selected = contactFields.includes(field.id);
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? contactFields.filter((id) => id !== field.id)
                          : [...contactFields, field.id];
                        onContactFieldsChange(next.length > 0 ? next : DEFAULT_CONTACT_FIELDS);
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px]",
                        selected
                          ? "border-primary bg-primary/5 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {field.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dates-skills">
        <AccordionTrigger>Dates and skills</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Date format</p>
                <OptionPills
                  options={DATE_FORMAT_OPTIONS}
                  value={dateFormat}
                  onChange={onDateFormatChange}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Date position</p>
                <OptionPills
                  options={DATE_POSITION_OPTIONS}
                  value={datePosition}
                  onChange={onDatePositionChange}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Skills layout</p>
                <OptionPills
                  options={SKILLS_LAYOUT_OPTIONS}
                  value={skillsLayout}
                  onChange={onSkillsLayoutChange}
                />
              </div>
            </div>
            <ResumeSectionDepthSettings
              values={designExtension}
              onChange={(patch) =>
                onDesignExtensionChange({ ...designExtension, ...patch })
              }
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sections">
        <AccordionTrigger>Sections</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1">
            {sections.map((entry, index) => {
              const hidden = !entry.showInPreview;
              const busy = sectionBusyId === entry.section.id;
              const shownTitle = entry.displayTitle?.trim() || entry.section.title;
              return (
                <li
                  key={entry.section.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-md border px-2 py-1.5",
                    hidden && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={shownTitle}
                      disabled={busy}
                      aria-label={`Display name for ${entry.section.title}`}
                      className="min-w-0 flex-1 truncate rounded border bg-background px-1.5 py-0.5 text-xs"
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        const current = entry.displayTitle?.trim() || "";
                        const baseline = entry.section.title;
                        const resolved = next === baseline || next === "" ? null : next;
                        if ((resolved ?? "") === (current || "")) return;
                        void (async () => {
                          setSectionBusyId(entry.section.id);
                          try {
                            const updated = await updateResumeSectionDisplayTitle(
                              resumeId,
                              entry.section.id,
                              resolved
                            );
                            onSectionsChange?.(
                              updated.sections.map((row) => ({
                                section: row.section,
                                showInPreview: row.showInPreview,
                                displayTitle: row.displayTitle,
                              }))
                            );
                          } catch {
                            toast.error("Could not update section title.");
                            event.target.value = shownTitle;
                          } finally {
                            setSectionBusyId(null);
                          }
                        })();
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={busy || index === 0}
                      aria-label={`Move ${shownTitle} up`}
                      onClick={() => void moveSection(index, -1)}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={busy || index === sections.length - 1}
                      aria-label={`Move ${shownTitle} down`}
                      onClick={() => void moveSection(index, 1)}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={busy}
                      aria-label={hidden ? `Show ${shownTitle}` : `Hide ${shownTitle}`}
                      onClick={() =>
                        void toggleSectionVisibility(entry.section.id, !entry.showInPreview)
                      }
                    >
                      {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="spacing-items">
        <AccordionTrigger>Spacing and items</AccordionTrigger>
        <AccordionContent>
          <ResumeSpacingItemsSettings
            values={designExtension}
            onChange={(patch) =>
              onDesignExtensionChange({ ...designExtension, ...patch })
            }
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="type-depth">
        <AccordionTrigger>Type depth</AccordionTrigger>
        <AccordionContent>
          <ResumeTypeDepthSettings
            values={designExtension}
            onChange={(patch) =>
              onDesignExtensionChange({ ...designExtension, ...patch })
            }
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="export-ats">
        <AccordionTrigger>Export and ATS</AccordionTrigger>
        <AccordionContent>
          <ResumeExportAtsSettings
            values={designExtension}
            onChange={(patch) =>
              onDesignExtensionChange({ ...designExtension, ...patch })
            }
            atsMode={atsMode}
            onAtsModeChange={onAtsModeChange}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
