"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
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
import { normalizeLinkedInProfileUrl } from "@/lib/cv/linkedin-profile-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RESUME_FILE_ACCEPT = ".pdf,.doc,.docx";
const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

function isResumeFile(file: File): boolean {
  if (RESUME_MIME_TYPES.includes(file.type as (typeof RESUME_MIME_TYPES)[number])) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx");
}

function validateResumeFile(file: File): string | null {
  if (!isResumeFile(file)) return "Use a PDF or Word document.";
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File must be ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} or smaller.`;
  }
  return null;
}

interface OnboardingImportFileProps {
  onSuccess: () => void;
}

export function OnboardingImportFile({ onSuccess }: OnboardingImportFileProps) {
  const { startNewChat, sendMessage, setOpen: setAssistantOpen } = useCvAssistant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<ComposerAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dragDepthRef = useRef(0);

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
    setSelectedFile(await createComposerAttachment(file));
  };

  const runImport = async (message: string, attachments: ComposerAttachment[] = []) => {
    setIsImporting(true);
    try {
      const thread = await startNewChat();
      setAssistantOpen(true);
      await sendMessage(message, attachments, {
        threadId: thread.id,
        contextOverride: { view: "resumes" },
      });
      toast.success("I'm building your resume. Let's keep going.");
      onSuccess();
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
    if (dragDepthRef.current === 0) setIsDragOver(false);
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
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border border-dashed p-6 text-center transition-colors",
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
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
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
            <p className="text-sm text-muted-foreground">
              Drag a PDF or Word file here, or{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        className="w-full"
        disabled={!selectedFile || isImporting}
        onClick={() =>
          void runImport(
            "Import this resume file and create a new CV with my experience, education, and skills.",
            selectedFile ? [selectedFile] : []
          )
        }
      >
        {isImporting ? (
          <>
            <Loader2 className="animate-spin" />
            Working on it…
          </>
        ) : (
          "Upload and continue"
        )}
      </Button>
    </div>
  );
}

interface OnboardingImportLinkedInProps {
  onSuccess: () => void;
}

export function OnboardingImportLinkedIn({ onSuccess }: OnboardingImportLinkedInProps) {
  const { startNewChat, sendMessage, setOpen: setAssistantOpen } = useCvAssistant();
  const [linkedInUsername, setLinkedInUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async () => {
    const profileUrl = normalizeLinkedInProfileUrl(linkedInUsername);
    if (!profileUrl) {
      setError("Enter your LinkedIn username, for example janedoe.");
      return;
    }
    setIsImporting(true);
    setError(null);
    try {
      const thread = await startNewChat();
      setAssistantOpen(true);
      await sendMessage(
        `Import my resume from LinkedIn profile ${profileUrl} and create a new CV with my experience, education, and skills.`,
        [],
        { threadId: thread.id, contextOverride: { view: "resumes" } }
      );
      toast.success("I'm pulling from LinkedIn. Let's keep going.");
      onSuccess();
    } catch (importError) {
      toast.error(
        importError instanceof Error
          ? importError.message
          : "Could not start the import. Try again."
      );
    } finally {
      setIsImporting(false);
    }
  }, [linkedInUsername, onSuccess, sendMessage, setAssistantOpen, startNewChat]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="onboarding-linkedin" className="text-sm font-medium">
          LinkedIn username or profile URL
        </label>
        <Input
          id="onboarding-linkedin"
          placeholder="janedoe"
          value={linkedInUsername}
          disabled={isImporting}
          onChange={(event) => {
            setLinkedInUsername(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleImport();
          }}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <Button type="button" className="w-full" disabled={isImporting} onClick={() => void handleImport()}>
        {isImporting ? (
          <>
            <Loader2 className="animate-spin" />
            Working on it…
          </>
        ) : (
          "Import and continue"
        )}
      </Button>
    </div>
  );
}
