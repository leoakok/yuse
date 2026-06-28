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
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { PageFormat, ResumeWithContent, SectionItem, SectionItemUsage } from "@/lib/types/cv";
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
import { SECTION_TYPE_LABELS } from "@/lib/cv/constants";
import { cn } from "@/lib/utils";

function initialMargin(value: number | undefined): number {
  return value ?? DEFAULT_PAGE_MARGIN_MM;
}

type WorkspaceMode = "sections" | "design";

const MAX_LISTED_RESUMES = 5;

interface ResumeWorkspaceProps {
  content: ResumeWithContent;
  onContentChange: (content: ResumeWithContent) => void;
  onPageFormatPreviewChange?: (format: PageFormat) => void;
  onShowPhotoPreviewChange?: (showPhoto: boolean) => void;
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
  onMarginHorizontalPreviewChange,
  onMarginVerticalPreviewChange,
  onDownload,
  isDownloading = false,
  downloadError,
  onDismissDownloadError,
}: ResumeWorkspaceProps) {
  const router = useRouter();
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

  function handleDesignSaved({
    pageFormat: format,
    showPhoto: nextShowPhoto,
    marginHorizontalMm: horizontal,
    marginVerticalMm: vertical,
  }: {
    pageFormat: PageFormat;
    showPhoto: boolean;
    marginHorizontalMm: number;
    marginVerticalMm: number;
  }) {
    setSavedPageFormat(format);
    setSavedShowPhoto(nextShowPhoto);
    setSavedMarginHorizontalMm(horizontal);
    setSavedMarginVerticalMm(vertical);
    onContentChange({
      ...content,
      settings: {
        ...content.settings,
        pageFormat: format,
        showPhoto: nextShowPhoto,
        marginHorizontalMm: horizontal,
        marginVerticalMm: vertical,
      },
    });
    onPageFormatPreviewChange?.(format);
    onShowPhotoPreviewChange?.(nextShowPhoto);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex rounded-lg border p-0.5">
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
        <div className="flex items-center gap-2">
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
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div>
          {mode === "design" ? (
            <div className="px-4 py-3 lg:px-5">
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
              onPageFormatChange={handlePageFormatChange}
              onShowPhotoChange={handleShowPhotoChange}
              onMarginHorizontalChange={handleMarginHorizontalChange}
              onMarginVerticalChange={handleMarginVerticalChange}
              onSaved={handleDesignSaved}
            />
            </div>
          ) : (
            <div className="divide-y">
              <ResumeProfileSection
                resumeId={content.resume.id}
                contactProfile={content.contactProfile}
                onSaved={onContentChange}
              />
              {content.sections.map(({ section, items }) => (
                <section key={section.id}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3 lg:px-5">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold">{section.title}</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {SECTION_TYPE_LABELS[section.type] ?? section.type}
                      </p>
                    </div>
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
              variant="outline"
              disabled={isDeletingItem}
              onClick={() => {
                setDeleteItemTarget(null);
                setDeleteItemUsage(undefined);
              }}
            >
              Cancel
            </Button>
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
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
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
    </div>
  );
}
