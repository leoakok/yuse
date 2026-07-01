"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import {
  createComposerAttachment,
  formatFileSize,
  MAX_ATTACHMENT_SIZE_BYTES,
  revokeAttachmentPreview,
} from "@/lib/assistant/attachments";
import type { ComposerAttachment } from "@/lib/types/assistant";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { normalizeLinkedInProfileUrl } from "@/lib/cv/linkedin-profile-url";
import { cn } from "@/lib/utils";

const RESUME_FILE_ACCEPT = ".pdf,.doc,.docx";
const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

interface ResumeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isResumeFile(file: File): boolean {
  if (RESUME_MIME_TYPES.includes(file.type as (typeof RESUME_MIME_TYPES)[number])) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx");
}

function validateResumeFile(file: File): string | null {
  if (!isResumeFile(file)) {
    return "Use a PDF or Word document.";
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File must be ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} or smaller.`;
  }
  return null;
}

export function ResumeImportDialog({ open, onOpenChange }: ResumeImportDialogProps) {
  const { startNewChat, sendMessage, setOpen: setAssistantOpen } = useCvAssistant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<ComposerAttachment | null>(null);
  const [linkedInUsername, setLinkedInUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dragDepthRef = useRef(0);

  const resetState = useCallback(() => {
    setLinkedInUsername("");
    setError(null);
    setIsDragOver(false);
    dragDepthRef.current = 0;
    setSelectedFile((current) => {
      if (current) revokeAttachmentPreview(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleOpenChange = (next: boolean) => {
    if (isImporting) return;
    onOpenChange(next);
  };

  const selectFile = async (file: File | undefined) => {
    if (!file || isImporting) return;

    const validationError = validateResumeFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile((current) => {
      if (current) revokeAttachmentPreview(current);
      return null;
    });
    const attachment = await createComposerAttachment(file);
    setSelectedFile(attachment);
  };

  const runImport = async (message: string, attachments: ComposerAttachment[] = []) => {
    setIsImporting(true);
    try {
      const thread = await startNewChat();
      setAssistantOpen(true);
      onOpenChange(false);
      await sendMessage(message, attachments, {
        threadId: thread.id,
        contextOverride: { view: "resumes" },
      });
      toast.success("Yuse is building your resume.");
    } catch (importError) {
      toast.error(
        importError instanceof Error
          ? importError.message
          : "Could not start the import. Try again."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImport = async () => {
    if (!selectedFile) {
      setError("Choose a resume file to continue.");
      return;
    }
    await runImport(
      "Import this resume file and create a new CV with my experience, education, and skills.",
      [selectedFile]
    );
  };

  const handleLinkedInImport = async () => {
    const profileUrl = normalizeLinkedInProfileUrl(linkedInUsername);
    if (!profileUrl) {
      setError("Enter your LinkedIn username, for example janedoe.");
      return;
    }

    await runImport(
      `Import my resume from LinkedIn profile ${profileUrl} and create a new CV with my experience, education, and skills.`
    );
  };

  const handleImport = () => {
    if (selectedFile) {
      void handleFileImport();
      return;
    }
    void handleLinkedInImport();
  };

  const canImport =
    Boolean(selectedFile) || Boolean(normalizeLinkedInProfileUrl(linkedInUsername));

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (isImporting) return;
    void selectFile(event.dataTransfer.files[0]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isImporting}>
        <DialogHeader>
          <DialogTitle>Import a resume</DialogTitle>
          <DialogDescription>
            Upload an existing resume or enter your LinkedIn username.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div
            className={cn(
              "rounded-lg border border-dashed p-6 text-center transition-colors",
              isDragOver && "border-primary bg-primary/5",
              selectedFile && "border-solid"
            )}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={RESUME_FILE_ACCEPT}
              className="sr-only"
              disabled={isImporting}
              onChange={(event) => void selectFile(event.target.files?.[0])}
            />
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
              <FileUp className="size-5 text-muted-foreground" aria-hidden />
            </div>
            {selectedFile ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose a different file
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm">
                  Drag a PDF or Word file here, or{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF or Word, up to {formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <div className="grid gap-2">
            <label htmlFor="linkedin-username" className="text-sm font-medium">
              LinkedIn username
            </label>
            <Input
              id="linkedin-username"
              value={linkedInUsername}
              onChange={(event) => {
                setLinkedInUsername(event.target.value);
                setError(null);
              }}
              placeholder="janedoe"
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground">
              From linkedin.com/in/<span className="font-medium">username</span>
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={isImporting || !canImport}
            onClick={handleImport}
          >
            {isImporting ? (
              <>
                <Loader2 className="animate-spin" />
                Importing…
              </>
            ) : (
              "Import resume"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
