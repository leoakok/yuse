"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  LayoutTemplate,
  List,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Trash2,
} from "lucide-react";
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
  ResumeSettings,
  ResumeWithContent,
  SectionDividerStyle,
  SidebarPosition,
  SidebarWidth,
  SkillsLayout,
  SectionItem,
  SectionItemUsage,
} from "@/lib/types/cv";
import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/cv/accent";
import { DEFAULT_CONTACT_FIELDS } from "@/lib/cv/contact-header";
import { DEFAULT_CV_FONT_FAMILY } from "@/lib/cv/fonts";
import { DEFAULT_PHOTO_POSITION, DEFAULT_PHOTO_SIZE } from "@/lib/cv/photo";
import {
  DEFAULT_RESUME_DESIGN_EXTENSION,
  pickResumeDesignExtension,
  type ResumeDesignExtensionFields,
} from "@/lib/cv/resume-design";
import { DEFAULT_CV_TYPOGRAPHY_SETTINGS, type CvTypographySettings } from "@/lib/cv/typography";
import type { ResumeDesignSnapshot } from "@/components/cv/resume-design-settings";
import { ResumeDesignSettings } from "@/components/cv/resume-design-settings";
import { ResumeProfileSection } from "@/components/cv/resume-profile-section";
import { ResumeSectionItemRow } from "@/components/cv/resume-section-item-row";
import {
  SectionItemEditDialog,
  type SectionItemDialogState,
} from "@/components/cv/section-item-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  deleteResume,
  deleteSectionItem,
  duplicateResume,
  getSectionItemUsage,
  updateResumeSectionItemVisibility,
} from "@/lib/api/cv-api";
import { resumePath } from "@/lib/cv/routes";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { cn } from "@/lib/utils";
import {
  WorkspacePanel,
  WorkspacePanelBody,
  WorkspacePanelHeader,
} from "@/components/layout/workspace-panel";
import { useEditorPanel } from "@/components/layout/editor-panel-provider";

function initialMargin(value: number | undefined): number {
  return value ?? DEFAULT_PAGE_MARGIN_MM;
}

function pickTypography(settings: ResumeWithContent["settings"]): CvTypographySettings {
  return {
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
}

type WorkspaceMode = "sections" | "design";

const MAX_LISTED_RESUMES = 5;

interface ResumeWorkspaceProps {
  content: ResumeWithContent;
  onContentChange: (content: ResumeWithContent) => void;
  onPageFormatPreviewChange?: (format: PageFormat) => void;
  onShowPhotoPreviewChange?: (showPhoto: boolean) => void;
  onItemTitleLayoutPreviewChange?: (layout: ItemTitleLayout) => void;
  onItemTitleSeparatorPreviewChange?: (separator: ItemTitleSeparator) => void;
  onItemTitleOrderPreviewChange?: (order: ItemTitleOrder) => void;
  onFontFamilyPreviewChange?: (fontFamily: FontFamily) => void;
  onAccentColorPreviewChange?: (color: string) => void;
  onSectionDividerStylePreviewChange?: (style: SectionDividerStyle) => void;
  onDateFormatPreviewChange?: (format: DateFormat) => void;
  onDatePositionPreviewChange?: (position: DatePosition) => void;
  onSkillsLayoutPreviewChange?: (layout: SkillsLayout) => void;
  onAtsModePreviewChange?: (enabled: boolean) => void;
  onDesignSettingsPreviewChange?: (patch: Partial<ResumeSettings>) => void;
  onTypographyPreviewChange?: (typography: CvTypographySettings) => void;
  onMarginHorizontalPreviewChange?: (value: number) => void;
  onMarginVerticalPreviewChange?: (value: number) => void;
  onDownload?: () => void | Promise<void>;
  isDownloading?: boolean;
  downloadError?: string | null;
  onDismissDownloadError?: () => void;
}

export function ResumeWorkspace({
  content,
  onContentChange,
  onPageFormatPreviewChange,
  onShowPhotoPreviewChange,
  onItemTitleLayoutPreviewChange,
  onItemTitleSeparatorPreviewChange,
  onItemTitleOrderPreviewChange,
  onFontFamilyPreviewChange,
  onAccentColorPreviewChange,
  onSectionDividerStylePreviewChange,
  onDateFormatPreviewChange,
  onDatePositionPreviewChange,
  onSkillsLayoutPreviewChange,
  onAtsModePreviewChange,
  onDesignSettingsPreviewChange,
  onTypographyPreviewChange,
  onMarginHorizontalPreviewChange,
  onMarginVerticalPreviewChange,
  onDownload,
  isDownloading = false,
  downloadError,
  onDismissDownloadError,
}: ResumeWorkspaceProps) {
  const router = useRouter();
  const { setOpen: setEditorOpen } = useEditorPanel();
  const [mode, setMode] = useState<WorkspaceMode>("sections");
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
  const [itemTitleLayout, setItemTitleLayout] = useState<ItemTitleLayout>(
    content.settings.itemTitleLayout ?? "STACKED"
  );
  const [savedItemTitleLayout, setSavedItemTitleLayout] = useState<ItemTitleLayout>(
    content.settings.itemTitleLayout ?? "STACKED"
  );
  const [itemTitleSeparator, setItemTitleSeparator] = useState<ItemTitleSeparator>(
    content.settings.itemTitleSeparator ?? "DOT"
  );
  const [savedItemTitleSeparator, setSavedItemTitleSeparator] = useState<ItemTitleSeparator>(
    content.settings.itemTitleSeparator ?? "DOT"
  );
  const [itemTitleOrder, setItemTitleOrder] = useState<ItemTitleOrder>(
    content.settings.itemTitleOrder ?? "TITLE_FIRST"
  );
  const [savedItemTitleOrder, setSavedItemTitleOrder] = useState<ItemTitleOrder>(
    content.settings.itemTitleOrder ?? "TITLE_FIRST"
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    content.settings.fontFamily ?? DEFAULT_CV_FONT_FAMILY
  );
  const [savedFontFamily, setSavedFontFamily] = useState<FontFamily>(
    content.settings.fontFamily ?? DEFAULT_CV_FONT_FAMILY
  );
  const [accentColor, setAccentColor] = useState(
    content.settings.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR
  );
  const [savedAccentColor, setSavedAccentColor] = useState(
    content.settings.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR
  );
  const [sectionDividerStyle, setSectionDividerStyle] = useState<SectionDividerStyle>(
    content.settings.sectionDividerStyle ?? "FULL"
  );
  const [savedSectionDividerStyle, setSavedSectionDividerStyle] = useState<SectionDividerStyle>(
    content.settings.sectionDividerStyle ?? "FULL"
  );
  const [dateFormat, setDateFormat] = useState<DateFormat>(
    content.settings.dateFormat ?? "MON_YYYY"
  );
  const [savedDateFormat, setSavedDateFormat] = useState<DateFormat>(
    content.settings.dateFormat ?? "MON_YYYY"
  );
  const [datePosition, setDatePosition] = useState<DatePosition>(
    content.settings.datePosition ?? "RIGHT"
  );
  const [savedDatePosition, setSavedDatePosition] = useState<DatePosition>(
    content.settings.datePosition ?? "RIGHT"
  );
  const [skillsLayout, setSkillsLayout] = useState<SkillsLayout>(
    content.settings.skillsLayout ?? "LIST"
  );
  const [savedSkillsLayout, setSavedSkillsLayout] = useState<SkillsLayout>(
    content.settings.skillsLayout ?? "LIST"
  );
  const [atsMode, setAtsMode] = useState(content.settings.atsMode ?? false);
  const [savedAtsMode, setSavedAtsMode] = useState(content.settings.atsMode ?? false);
  const [columnLayout, setColumnLayout] = useState<ColumnLayout>(
    content.settings.columnLayout ?? "SINGLE"
  );
  const [savedColumnLayout, setSavedColumnLayout] = useState<ColumnLayout>(
    content.settings.columnLayout ?? "SINGLE"
  );
  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>(
    content.settings.sidebarPosition ?? "LEFT"
  );
  const [savedSidebarPosition, setSavedSidebarPosition] = useState<SidebarPosition>(
    content.settings.sidebarPosition ?? "LEFT"
  );
  const [sidebarWidth, setSidebarWidth] = useState<SidebarWidth>(
    content.settings.sidebarWidth ?? "MEDIUM"
  );
  const [savedSidebarWidth, setSavedSidebarWidth] = useState<SidebarWidth>(
    content.settings.sidebarWidth ?? "MEDIUM"
  );
  const [designPresetId, setDesignPresetId] = useState<DesignPresetId>(
    content.settings.designPresetId ?? "MODERN"
  );
  const [savedDesignPresetId, setSavedDesignPresetId] = useState<DesignPresetId>(
    content.settings.designPresetId ?? "MODERN"
  );
  const [photoPosition, setPhotoPosition] = useState<PhotoPosition>(
    content.settings.photoPosition ?? DEFAULT_PHOTO_POSITION
  );
  const [savedPhotoPosition, setSavedPhotoPosition] = useState<PhotoPosition>(
    content.settings.photoPosition ?? DEFAULT_PHOTO_POSITION
  );
  const [photoSize, setPhotoSize] = useState<PhotoSize>(
    content.settings.photoSize ?? DEFAULT_PHOTO_SIZE
  );
  const [savedPhotoSize, setSavedPhotoSize] = useState<PhotoSize>(
    content.settings.photoSize ?? DEFAULT_PHOTO_SIZE
  );
  const [contactLayout, setContactLayout] = useState<ContactLayout>(
    content.settings.contactLayout ?? "INLINE"
  );
  const [savedContactLayout, setSavedContactLayout] = useState<ContactLayout>(
    content.settings.contactLayout ?? "INLINE"
  );
  const [contactFields, setContactFields] = useState<ContactField[]>(
    content.settings.contactFields ?? DEFAULT_CONTACT_FIELDS
  );
  const [savedContactFields, setSavedContactFields] = useState<ContactField[]>(
    content.settings.contactFields ?? DEFAULT_CONTACT_FIELDS
  );
  const [typography, setTypography] = useState<CvTypographySettings>(() =>
    pickTypography(content.settings)
  );
  const [savedTypography, setSavedTypography] = useState<CvTypographySettings>(() =>
    pickTypography(content.settings)
  );
  const [designExtension, setDesignExtension] = useState<ResumeDesignExtensionFields>(() =>
    pickResumeDesignExtension(content.settings)
  );
  const [savedDesignExtension, setSavedDesignExtension] = useState<ResumeDesignExtensionFields>(
    () => pickResumeDesignExtension(content.settings)
  );
  const [itemDialog, setItemDialog] = useState<SectionItemDialogState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<SectionItem | null>(null);
  const [deleteItemUsage, setDeleteItemUsage] = useState<SectionItemUsage | null | undefined>(
    undefined
  );
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleToggleVisibility(
    sectionId: string,
    sectionItemId: string,
    showInPreview: boolean
  ) {
    const updated = await updateResumeSectionItemVisibility(
      content.resume.id,
      sectionId,
      sectionItemId,
      showInPreview
    );
    onContentChange(updated);
  }

  function handlePageFormatChange(format: PageFormat) {
    setPageFormat(format);
    onPageFormatPreviewChange?.(format);
  }

  function handleMarginHorizontalChange(value: number) {
    setMarginHorizontalMm(value);
    onMarginHorizontalPreviewChange?.(value);
  }

  function handleMarginVerticalChange(value: number) {
    setMarginVerticalMm(value);
    onMarginVerticalPreviewChange?.(value);
  }

  function handleShowPhotoChange(nextShowPhoto: boolean) {
    setShowPhoto(nextShowPhoto);
    onShowPhotoPreviewChange?.(nextShowPhoto);
  }

  function handleItemTitleLayoutChange(nextLayout: ItemTitleLayout) {
    setItemTitleLayout(nextLayout);
    onItemTitleLayoutPreviewChange?.(nextLayout);
  }

  function handleItemTitleSeparatorChange(nextSeparator: ItemTitleSeparator) {
    setItemTitleSeparator(nextSeparator);
    onItemTitleSeparatorPreviewChange?.(nextSeparator);
  }

  function handleItemTitleOrderChange(nextOrder: ItemTitleOrder) {
    setItemTitleOrder(nextOrder);
    onItemTitleOrderPreviewChange?.(nextOrder);
  }

  function handleFontFamilyChange(nextFontFamily: FontFamily) {
    setFontFamily(nextFontFamily);
    onFontFamilyPreviewChange?.(nextFontFamily);
  }

  function handleAccentColorChange(nextColor: string) {
    setAccentColor(nextColor);
    onAccentColorPreviewChange?.(nextColor);
  }

  function handleSectionDividerStyleChange(nextStyle: SectionDividerStyle) {
    setSectionDividerStyle(nextStyle);
    onSectionDividerStylePreviewChange?.(nextStyle);
  }

  function handleDateFormatChange(nextFormat: DateFormat) {
    setDateFormat(nextFormat);
    onDateFormatPreviewChange?.(nextFormat);
  }

  function handleDatePositionChange(nextPosition: DatePosition) {
    setDatePosition(nextPosition);
    onDatePositionPreviewChange?.(nextPosition);
  }

  function handleSkillsLayoutChange(nextLayout: SkillsLayout) {
    setSkillsLayout(nextLayout);
    onSkillsLayoutPreviewChange?.(nextLayout);
  }

  function handleAtsModeChange(nextAtsMode: boolean) {
    setAtsMode(nextAtsMode);
    onAtsModePreviewChange?.(nextAtsMode);
    onDesignSettingsPreviewChange?.({ atsMode: nextAtsMode });
  }

  function patchDesignPreview(patch: Partial<ResumeSettings>) {
    onDesignSettingsPreviewChange?.(patch);
  }

  function handleColumnLayoutChange(next: ColumnLayout) {
    setColumnLayout(next);
    patchDesignPreview({ columnLayout: next });
  }

  function handleSidebarPositionChange(next: SidebarPosition) {
    setSidebarPosition(next);
    patchDesignPreview({ sidebarPosition: next });
  }

  function handleSidebarWidthChange(next: SidebarWidth) {
    setSidebarWidth(next);
    patchDesignPreview({ sidebarWidth: next });
  }

  function handleDesignPresetChange(next: DesignPresetId) {
    setDesignPresetId(next);
    patchDesignPreview({ designPresetId: next });
  }

  function handlePhotoPositionChange(next: PhotoPosition) {
    setPhotoPosition(next);
    patchDesignPreview({ photoPosition: next });
  }

  function handlePhotoSizeChange(next: PhotoSize) {
    setPhotoSize(next);
    patchDesignPreview({ photoSize: next });
  }

  function handleContactLayoutChange(next: ContactLayout) {
    setContactLayout(next);
    patchDesignPreview({ contactLayout: next });
  }

  function handleContactFieldsChange(next: ContactField[]) {
    setContactFields(next);
    patchDesignPreview({ contactFields: next });
  }

  function handleTypographyChange(nextTypography: CvTypographySettings) {
    setTypography(nextTypography);
    onTypographyPreviewChange?.(nextTypography);
  }

  function handleDesignExtensionChange(next: ResumeDesignExtensionFields) {
    setDesignExtension(next);
    patchDesignPreview(next);
  }

  function handleDesignSaved(snapshot: ResumeDesignSnapshot) {
    const {
      pageFormat: format,
      showPhoto: nextShowPhoto,
      itemTitleLayout: nextItemTitleLayout,
      itemTitleSeparator: nextItemTitleSeparator,
      itemTitleOrder: nextItemTitleOrder,
      fontFamily: nextFontFamily,
      accentColor: nextAccentColor,
      sectionDividerStyle: nextSectionDividerStyle,
      dateFormat: nextDateFormat,
      datePosition: nextDatePosition,
      skillsLayout: nextSkillsLayout,
      atsMode: nextAtsMode,
      columnLayout: nextColumnLayout,
      sidebarPosition: nextSidebarPosition,
      sidebarWidth: nextSidebarWidth,
      designPresetId: nextDesignPresetId,
      photoPosition: nextPhotoPosition,
      photoSize: nextPhotoSize,
      contactLayout: nextContactLayout,
      contactFields: nextContactFields,
      marginHorizontalMm: horizontal,
      marginVerticalMm: vertical,
      typography: nextTypography,
      designExtension: nextDesignExtension,
    } = snapshot;
    setSavedPageFormat(format);
    setSavedShowPhoto(nextShowPhoto);
    setSavedItemTitleLayout(nextItemTitleLayout);
    setSavedItemTitleSeparator(nextItemTitleSeparator);
    setSavedItemTitleOrder(nextItemTitleOrder);
    setSavedFontFamily(nextFontFamily);
    setSavedAccentColor(nextAccentColor);
    setSavedSectionDividerStyle(nextSectionDividerStyle);
    setSavedDateFormat(nextDateFormat);
    setSavedDatePosition(nextDatePosition);
    setSavedSkillsLayout(nextSkillsLayout);
    setSavedAtsMode(nextAtsMode);
    setSavedColumnLayout(nextColumnLayout);
    setSavedSidebarPosition(nextSidebarPosition);
    setSavedSidebarWidth(nextSidebarWidth);
    setSavedDesignPresetId(nextDesignPresetId);
    setSavedPhotoPosition(nextPhotoPosition);
    setSavedPhotoSize(nextPhotoSize);
    setSavedContactLayout(nextContactLayout);
    setSavedContactFields(nextContactFields);
    setSavedMarginHorizontalMm(horizontal);
    setSavedMarginVerticalMm(vertical);
    setSavedTypography(nextTypography);
    setSavedDesignExtension(nextDesignExtension);
    onContentChange({
      ...content,
      settings: {
        ...content.settings,
        pageFormat: format,
        showPhoto: nextShowPhoto,
        itemTitleLayout: nextItemTitleLayout,
        itemTitleSeparator: nextItemTitleSeparator,
        itemTitleOrder: nextItemTitleOrder,
        fontFamily: nextFontFamily,
        accentColor: nextAccentColor,
        sectionDividerStyle: nextSectionDividerStyle,
        dateFormat: nextDateFormat,
        datePosition: nextDatePosition,
        skillsLayout: nextSkillsLayout,
        atsMode: nextAtsMode,
        columnLayout: nextColumnLayout,
        sidebarPosition: nextSidebarPosition,
        sidebarWidth: nextSidebarWidth,
        designPresetId: nextDesignPresetId,
        photoPosition: nextPhotoPosition,
        photoSize: nextPhotoSize,
        contactLayout: nextContactLayout,
        contactFields: nextContactFields,
        marginHorizontalMm: horizontal,
        marginVerticalMm: vertical,
        ...nextTypography,
        ...nextDesignExtension,
      },
    });
    onPageFormatPreviewChange?.(format);
    onShowPhotoPreviewChange?.(nextShowPhoto);
    onItemTitleLayoutPreviewChange?.(nextItemTitleLayout);
    onItemTitleSeparatorPreviewChange?.(nextItemTitleSeparator);
    onItemTitleOrderPreviewChange?.(nextItemTitleOrder);
    onFontFamilyPreviewChange?.(nextFontFamily);
    onAccentColorPreviewChange?.(nextAccentColor);
    onSectionDividerStylePreviewChange?.(nextSectionDividerStyle);
    onDateFormatPreviewChange?.(nextDateFormat);
    onDatePositionPreviewChange?.(nextDatePosition);
    onSkillsLayoutPreviewChange?.(nextSkillsLayout);
    onAtsModePreviewChange?.(nextAtsMode);
    onDesignSettingsPreviewChange?.({
      columnLayout: nextColumnLayout,
      sidebarPosition: nextSidebarPosition,
      sidebarWidth: nextSidebarWidth,
      designPresetId: nextDesignPresetId,
      photoPosition: nextPhotoPosition,
      photoSize: nextPhotoSize,
      contactLayout: nextContactLayout,
      contactFields: nextContactFields,
    });
    onMarginHorizontalPreviewChange?.(horizontal);
    onMarginVerticalPreviewChange?.(vertical);
  }

  async function handleDuplicate() {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const resume = await duplicateResume(content.resume.id);
      router.push(resumePath(resume.id));
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteResume(content.resume.id);
      toast.success("Resume deleted");
      router.push("/resumes");
    } catch {
      toast.error("Could not delete this resume. Try again.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleDeleteItemRequest(item: SectionItem) {
    setDeleteItemTarget(item);
    setDeleteItemUsage(undefined);
    try {
      const usage = await getSectionItemUsage(item.id);
      setDeleteItemUsage(usage ?? null);
    } catch {
      setDeleteItemUsage(null);
      toast.error("Could not load where this item is used. Try again.");
    }
  }

  async function handleDeleteItem() {
    if (!deleteItemTarget || isDeletingItem) return;
    setIsDeletingItem(true);
    try {
      const updated = await deleteSectionItem(content.resume.id, deleteItemTarget.id);
      onContentChange(updated);
      toast.success("Item deleted");
      setDeleteItemTarget(null);
      setDeleteItemUsage(undefined);
    } catch {
      toast.error("Could not delete this item. Try again.");
    } finally {
      setIsDeletingItem(false);
    }
  }

  function renderDeleteItemDescription() {
    if (!deleteItemTarget) {
      return "This item will be removed permanently. This cannot be undone.";
    }
    if (deleteItemUsage === undefined) {
      return "Checking where this item is used…";
    }
    const resumes = deleteItemUsage?.resumes ?? [];
    const count = resumes.length;
    const resumeWord = count === 1 ? "resume" : "resumes";
    if (count === 0) {
      return (
        <>
          &ldquo;{deleteItemTarget.headline}&rdquo; will be removed permanently. This cannot be
          undone.
        </>
      );
    }
    if (count <= MAX_LISTED_RESUMES) {
      return (
        <>
          This item appears on {count} {resumeWord}:
          <ul className="mt-2 list-disc pl-5">
            {resumes.map((resume) => (
              <li key={resume.id}>{resume.title}</li>
            ))}
          </ul>
          It will be removed from all of them permanently. This cannot be undone.
        </>
      );
    }
    return (
      <>
        This item appears on {count} resumes. It will be removed from all of them permanently.
        This cannot be undone.
      </>
    );
  }

  return (
    <WorkspacePanel>
      <WorkspacePanelBody>
      <ScrollArea className="min-h-0 flex-1">
      <WorkspacePanelHeader
        leading={
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-8 shrink-0 lg:inline-flex"
              onClick={() => setEditorOpen(false)}
            >
              <PanelLeftClose className="size-4" />
              <span className="sr-only">Hide editor</span>
            </Button>
            <div className="flex min-w-0 rounded-lg border p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-7 gap-1.5 px-2.5", mode === "sections" && "bg-muted")}
                aria-pressed={mode === "sections"}
                onClick={() => setMode("sections")}
              >
                <List className="size-3.5" />
                Sections
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-7 gap-1.5 px-2.5", mode === "design" && "bg-muted")}
                aria-pressed={mode === "design"}
                onClick={() => setMode("design")}
              >
                <LayoutTemplate className="size-3.5" />
                Design
              </Button>
            </div>
          </div>
        }
        trailing={
          <div className="flex shrink-0 items-center gap-2">
            {downloadError ? (
              <p
                className="max-w-48 truncate text-xs text-destructive"
                role="alert"
                title={downloadError}
              >
                {downloadError}
                {onDismissDownloadError ? (
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={onDismissDownloadError}
                  >
                    Dismiss
                  </button>
                ) : null}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => void onDownload?.()}
              disabled={!onDownload || isDownloading}
              aria-label={isDownloading ? "Opening print view" : "Print or save as PDF"}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    aria-label="More actions"
                  >
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  disabled={isDuplicating}
                  onClick={() => void handleDuplicate()}
                >
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="warning"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
        <div>
          {mode === "design" ? (
            <ResumeDesignSettings
              resumeId={content.resume.id}
              themeName={content.theme.name}
              sections={content.sections.map((row) => ({
                section: row.section,
                showInPreview: row.showInPreview,
                displayTitle: row.displayTitle,
              }))}
              onSectionsChange={(nextSections) =>
                onContentChange({
                  ...content,
                  sections: nextSections.map((row) => {
                    const existing = content.sections.find(
                      (entry) => entry.section.id === row.section.id
                    );
                    return {
                      section: row.section,
                      showInPreview: row.showInPreview,
                      items: existing?.items ?? [],
                    };
                  }),
                })
              }
              pageFormat={pageFormat}
              savedPageFormat={savedPageFormat}
              showPhoto={showPhoto}
              savedShowPhoto={savedShowPhoto}
              marginHorizontalMm={marginHorizontalMm}
              marginVerticalMm={marginVerticalMm}
              savedMarginHorizontalMm={savedMarginHorizontalMm}
              savedMarginVerticalMm={savedMarginVerticalMm}
              itemTitleLayout={itemTitleLayout}
              savedItemTitleLayout={savedItemTitleLayout}
              itemTitleSeparator={itemTitleSeparator}
              savedItemTitleSeparator={savedItemTitleSeparator}
              itemTitleOrder={itemTitleOrder}
              savedItemTitleOrder={savedItemTitleOrder}
              fontFamily={fontFamily}
              savedFontFamily={savedFontFamily}
              accentColor={accentColor}
              savedAccentColor={savedAccentColor}
              sectionDividerStyle={sectionDividerStyle}
              savedSectionDividerStyle={savedSectionDividerStyle}
              dateFormat={dateFormat}
              savedDateFormat={savedDateFormat}
              datePosition={datePosition}
              savedDatePosition={savedDatePosition}
              skillsLayout={skillsLayout}
              savedSkillsLayout={savedSkillsLayout}
              atsMode={atsMode}
              savedAtsMode={savedAtsMode}
              columnLayout={columnLayout}
              savedColumnLayout={savedColumnLayout}
              sidebarPosition={sidebarPosition}
              savedSidebarPosition={savedSidebarPosition}
              sidebarWidth={sidebarWidth}
              savedSidebarWidth={savedSidebarWidth}
              designPresetId={designPresetId}
              savedDesignPresetId={savedDesignPresetId}
              photoPosition={photoPosition}
              savedPhotoPosition={savedPhotoPosition}
              photoSize={photoSize}
              savedPhotoSize={savedPhotoSize}
              contactLayout={contactLayout}
              savedContactLayout={savedContactLayout}
              contactFields={contactFields}
              savedContactFields={savedContactFields}
              typography={typography}
              savedTypography={savedTypography}
              onPageFormatChange={handlePageFormatChange}
              onShowPhotoChange={handleShowPhotoChange}
              onItemTitleLayoutChange={handleItemTitleLayoutChange}
              onItemTitleSeparatorChange={handleItemTitleSeparatorChange}
              onItemTitleOrderChange={handleItemTitleOrderChange}
              onFontFamilyChange={handleFontFamilyChange}
              onAccentColorChange={handleAccentColorChange}
              onSectionDividerStyleChange={handleSectionDividerStyleChange}
              onDateFormatChange={handleDateFormatChange}
              onDatePositionChange={handleDatePositionChange}
              onSkillsLayoutChange={handleSkillsLayoutChange}
              onAtsModeChange={handleAtsModeChange}
              onColumnLayoutChange={handleColumnLayoutChange}
              onSidebarPositionChange={handleSidebarPositionChange}
              onSidebarWidthChange={handleSidebarWidthChange}
              onDesignPresetChange={handleDesignPresetChange}
              onPhotoPositionChange={handlePhotoPositionChange}
              onPhotoSizeChange={handlePhotoSizeChange}
              onContactLayoutChange={handleContactLayoutChange}
              onContactFieldsChange={handleContactFieldsChange}
              onTypographyChange={handleTypographyChange}
              designExtension={designExtension}
              savedDesignExtension={savedDesignExtension}
              onDesignExtensionChange={handleDesignExtensionChange}
              onMarginHorizontalChange={handleMarginHorizontalChange}
              onMarginVerticalChange={handleMarginVerticalChange}
              onSaved={handleDesignSaved}
            />
          ) : (
            <div className="divide-y">
              <ResumeProfileSection
                resumeId={content.resume.id}
                contactProfile={content.contactProfile}
                onSaved={onContentChange}
              />
              {content.sections.map(({ section, items }) => (
                <section key={section.id}>
                  {section.type !== "SUMMARY" ? (
                    <div className="flex items-center justify-between gap-2 px-4 py-3 lg:px-5">
                      <h2 className="min-w-0 text-sm font-semibold">{section.title}</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 text-muted-foreground"
                        aria-label={`Add item to ${section.title}`}
                        onClick={() =>
                          setItemDialog({
                            mode: "create",
                            sectionId: section.id,
                            sectionType: section.type,
                            sectionTitle: section.title,
                          })
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                  ) : null}
                  <ul className="divide-y">
                    {items.map((item) => (
                      <ResumeSectionItemRow
                        key={item.id}
                        item={item}
                        onToggleVisibility={(showInPreview) =>
                          handleToggleVisibility(section.id, item.id, showInPreview)
                        }
                        onEdit={() =>
                          setItemDialog({
                            mode: "edit",
                            sectionId: section.id,
                            sectionType: section.type,
                            item,
                          })
                        }
                        onDeleteRequest={() => void handleDeleteItemRequest(item)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      </WorkspacePanelBody>
      <SectionItemEditDialog
        resumeId={content.resume.id}
        dialog={itemDialog}
        onOpenChange={(open) => {
          if (!open) setItemDialog(null);
        }}
        onSaved={onContentChange}
      />
      <Dialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingItem) {
            setDeleteItemTarget(null);
            setDeleteItemUsage(undefined);
          }
        }}
      >
        <DialogContent showCloseButton={!isDeletingItem}>
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>{renderDeleteItemDescription()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="warning"
              disabled={!deleteItemTarget || isDeletingItem || deleteItemUsage === undefined}
              onClick={() => void handleDeleteItem()}
            >
              {isDeletingItem ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete this resume?</DialogTitle>
            <DialogDescription>
              &ldquo;{content.resume.title}&rdquo; will be removed permanently. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="warning"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePanel>
  );
}
