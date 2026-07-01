"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Resume, ResumeWithContent } from "@/lib/types/cv";
import { resumePath } from "@/lib/cv/routes";
import {
  deleteResume,
  duplicateResume,
  getResumeWithContent,
} from "@/lib/api/cv-api";
import { exportResumePdf } from "@/lib/cv/export-pdf";
import { CvPreview } from "@/components/cv/cv-preview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface ResumeCardProps {
  resume: Resume;
  onDeleted: (id: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResumeCard({ resume, onDeleted }: ResumeCardProps) {
  const router = useRouter();
  const [content, setContent] = useState<ResumeWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getResumeWithContent(resume.id).then((result) => {
      if (!cancelled) {
        setContent(result ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resume.id]);

  async function handleDuplicate() {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const duplicate = await duplicateResume(resume.id);
      toast.success("Resume duplicated.");
      router.push(resumePath(duplicate.id));
    } catch {
      toast.error("Could not duplicate this resume. Try again.");
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteResume(resume.id);
      toast.success("Resume deleted.");
      onDeleted(resume.id);
    } catch {
      toast.error("Could not delete this resume. Try again.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const exportContent = content ?? (await getResumeWithContent(resume.id));
      if (!exportContent) {
        throw new Error("Resume content is not available.");
      }
      await exportResumePdf({
        content: exportContent,
        filename: exportContent.resume.title,
      });
      toast.success("Print dialog opened.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not download this resume.";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <Card className="group flex h-full flex-col overflow-hidden transition-colors hover:bg-muted/40">
        <Link
          href={resumePath(resume.id)}
          className="relative block h-52 overflow-hidden border-b bg-muted/30"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
              <span className="sr-only">Loading preview</span>
            </div>
          ) : content ? (
            <div className="absolute inset-0 flex justify-center overflow-hidden">
              <div
                className="origin-top shadow-sm"
                style={{ transform: "scale(0.38)" }}
              >
                <CvPreview content={content} className="shadow-none" singlePage interactive={false} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Preview unavailable
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Link
                href={resumePath(resume.id)}
                className="line-clamp-2 group-hover:text-primary"
              >
                {resume.title}
              </Link>
            </CardTitle>
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground"
                      aria-label={`Actions for ${resume.title}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem
                    disabled={isDownloading}
                    onClick={() => void handleDownload()}
                  >
                    {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                    Download
                  </DropdownMenuItem>
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
            </CardAction>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href={resumePath(resume.id)}>
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(resume.updatedAt)}
              </p>
            </Link>
          </CardContent>
        </div>
      </Card>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete this resume?</DialogTitle>
            <DialogDescription>
              &ldquo;{resume.title}&rdquo; will be removed permanently. This cannot be
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
    </>
  );
}

interface ResumeGridProps {
  resumes: Resume[];
  onCreateResume?: () => void;
  onImportResume?: () => void;
  onResumeDeleted?: (id: string) => void;
}

export function ResumeGrid({
  resumes,
  onCreateResume,
  onImportResume,
  onResumeDeleted,
}: ResumeGridProps) {
  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium">No resumes yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first CV to start editing sections and previewing the layout.
          </p>
        </div>
        {onCreateResume || onImportResume ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onCreateResume ? (
              <Button type="button" size="sm" onClick={onCreateResume}>
                Create your first resume
              </Button>
            ) : null}
            {onImportResume ? (
              <Button type="button" variant="outline" size="sm" onClick={onImportResume}>
                Import a resume
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onDeleted={(id) => onResumeDeleted?.(id)}
        />
      ))}
    </div>
  );
}
