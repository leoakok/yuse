"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { floatingChipFogSurfaceClassName } from "@/lib/ui/floating-chip";
import { motionTransitionColors } from "@/lib/ui/motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const composerPillClassName = floatingChipFogSurfaceClassName;

const composerIconButtonClassName = cn(
  composerPillClassName,
  "size-10 shrink-0 rounded-full"
);

/** ~5 lines at text-sm / leading-5 plus vertical padding. */
const COMPOSER_TEXTAREA_MAX_HEIGHT_PX = 120;

interface AssistantComposerProps {
  onSubmit: (text: string, attachments: ComposerAttachment[]) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  className?: string;
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
  className,
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

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_TEXTAREA_MAX_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > COMPOSER_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight]);

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
    <form
      onSubmit={onFormSubmit}
      className={cn("relative w-full", className)}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isEditing ? (
        <p className="pb-2 text-xs text-muted-foreground">Editing message</p>
      ) : null}

      {isDragOver ? (
        <p className="pointer-events-none pb-2 text-xs text-primary">Drop files to attach</p>
      ) : null}

      {!isEditing ? (
        <AssistantAttachmentChips
          attachments={attachments}
          onRemove={removeAttachment}
          disabled={isBusy}
          className="pb-2"
        />
      ) : null}

      {error ? (
        <p className="pb-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex w-full items-end gap-2">
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={composerIconButtonClassName}
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
              variant="outline"
              size="icon"
              className={cn(
                composerIconButtonClassName,
                isDragOver && "border-primary ring-2 ring-primary/20"
              )}
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
          rows={1}
          className={cn(
            composerPillClassName,
            "min-h-10 max-h-[120px] flex-1 resize-none overflow-y-auto rounded-2xl px-4 py-2 text-sm leading-5 shadow-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            motionTransitionColors,
            isEditing && "border-primary/40 ring-1 ring-primary/20",
            isDragOver && "border-primary ring-2 ring-primary/20"
          )}
        />
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          disabled={!canSend}
          aria-label={isEditing ? "Save and resend" : "Send message"}
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </form>
  );
}
