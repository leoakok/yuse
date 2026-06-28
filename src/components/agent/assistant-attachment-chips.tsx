"use client";

import { FileText, ImageIcon, X } from "lucide-react";
import type { ComposerAttachment, MessageAttachment } from "@/lib/types/assistant";
import { formatFileSize } from "@/lib/assistant/attachments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AttachmentChipItem = MessageAttachment & {
  id?: string;
  previewUrl?: string;
};

interface AssistantAttachmentChipsProps {
  attachments: ComposerAttachment[] | MessageAttachment[];
  onRemove?: (id: string) => void;
  disabled?: boolean;
  variant?: "composer" | "message";
  className?: string;
}

function toChipItems(
  attachments: ComposerAttachment[] | MessageAttachment[]
): AttachmentChipItem[] {
  return attachments.map((attachment) => {
    if ("file" in attachment) {
      return {
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        previewUrl: attachment.previewUrl,
      };
    }
    return attachment;
  });
}

function AttachmentIcon({ attachment }: { attachment: AttachmentChipItem }) {
  if (attachment.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.previewUrl}
        alt=""
        className="size-8 shrink-0 rounded object-cover"
      />
    );
  }

  if (attachment.mimeType.startsWith("image/")) {
    return <ImageIcon className="size-4 shrink-0 opacity-70" aria-hidden />;
  }

  return <FileText className="size-4 shrink-0 opacity-70" aria-hidden />;
}

export function AssistantAttachmentChips({
  attachments,
  onRemove,
  disabled,
  variant = "composer",
  className,
}: AssistantAttachmentChipsProps) {
  if (attachments.length === 0) return null;

  const items = toChipItems(attachments);
  const isMessage = variant === "message";

  return (
    <ul
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Attached files"
    >
      {items.map((attachment, index) => (
        <li
          key={attachment.id ?? `${attachment.name}-${index}`}
          className={cn(
            "flex max-w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-xs",
            isMessage
              ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
              : "border-border bg-muted/40 text-foreground"
          )}
        >
          <AttachmentIcon attachment={attachment} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{attachment.name}</p>
            {attachment.size !== undefined ? (
              <p className={cn(isMessage ? "opacity-80" : "text-muted-foreground")}>
                {formatFileSize(attachment.size)}
              </p>
            ) : null}
          </div>
          {onRemove && attachment.id ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-7 shrink-0",
                isMessage && "text-primary-foreground hover:bg-primary-foreground/10"
              )}
              onClick={() => onRemove(attachment.id!)}
              disabled={disabled}
              aria-label={`Remove attachment ${attachment.name}`}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
