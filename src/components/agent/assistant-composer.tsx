"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { AssistantAttachmentChips } from "@/components/agent/assistant-attachment-chips";
import {
  createComposerAttachment,
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENT_COUNT,
  revokeAttachmentPreview,
  validateIncomingFiles,
} from "@/lib/assistant/attachments";
import type { ComposerAttachment } from "@/lib/types/assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssistantComposerProps {
  onSubmit: (text: string, attachments: ComposerAttachment[]) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

export function AssistantComposer({
  onSubmit,
  isLoading,
  disabled,
  placeholder = "Message Yuse…",
  value: controlledValue,
  onValueChange,
  isEditing = false,
  onCancelEdit,
}: AssistantComposerProps) {
  const [internalValue, setInternalValue] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragDepthRef = useRef(0);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback(
    (next: string) => {
      if (isControlled) {
        onValueChange?.(next);
      } else {
        setInternalValue(next);
      }
    },
    [isControlled, onValueChange]
  );

  const isBusy = Boolean(isLoading || disabled);
  const canSend =
    (value.trim().length > 0 || (!isEditing && attachments.length > 0)) && !isBusy && !error;

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (files.length === 0) return;

      const { accepted, errors } = validateIncomingFiles(files, attachments.length);
      if (errors.length > 0) {
        setError(errors[0]);
      } else {
        setError(null);
      }

      if (accepted.length === 0) return;

      const created = await Promise.all(accepted.map(createComposerAttachment));
      setAttachments((current) => [...current, ...created]);
    },
    [attachments.length]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) revokeAttachmentPreview(target);
      return current.filter((attachment) => attachment.id !== id);
    });
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if ((!trimmed && (isEditing || attachments.length === 0)) || isBusy || error) return;

    const draftText = value;
    const draftAttachments = isEditing ? [] : attachments;

    if (!isEditing) {
      setValue("");
      setAttachments([]);
    }

    try {
      await onSubmit(trimmed, isEditing ? [] : draftAttachments);
      if (!isEditing) {
        draftAttachments.forEach(revokeAttachmentPreview);
      }
      setError(null);
    } catch {
      if (!isEditing) {
        setValue(draftText);
        setAttachments(draftAttachments);
      }
    }
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
    if (event.key === "Escape" && isEditing && onCancelEdit) {
      event.preventDefault();
      onCancelEdit();
    }
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (isBusy) return;
    void addFiles(event.dataTransfer.files);
  };

  return (
    <form onSubmit={onFormSubmit} className="relative w-full">
      <div
        className={cn(
          "rounded-xl border bg-card p-2 transition-colors",
          isEditing && "border-primary/40 ring-1 ring-primary/20",
          isDragOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
        )}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {isEditing ? (
          <p className="px-1 pb-2 text-xs text-muted-foreground">Editing message</p>
        ) : null}

        {isDragOver ? (
          <p className="pointer-events-none px-2 pb-2 text-xs text-primary">
            Drop files to attach
          </p>
        ) : null}

        {!isEditing ? (
          <AssistantAttachmentChips
            attachments={attachments}
            onRemove={removeAttachment}
            disabled={isBusy}
            className="px-1 pb-2"
          />
        ) : null}

        {error ? (
          <p className="px-1 pb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              disabled={isBusy}
              onClick={onCancelEdit}
              aria-label="Cancel edit"
            >
              <X className="size-4" />
            </Button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={FILE_INPUT_ACCEPT}
                className="sr-only"
                disabled={isBusy}
                onChange={(event) => {
                  const { files } = event.target;
                  if (files) void addFiles(files);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                disabled={isBusy || attachments.length >= MAX_ATTACHMENT_COUNT}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Paperclip className="size-4" />
              </Button>
            </>
          )}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isEditing ? "Edit your message…" : placeholder}
            disabled={isBusy}
            rows={2}
            className="min-h-[44px] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0"
            disabled={!canSend}
            aria-label={isEditing ? "Save and resend" : "Send message"}
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
