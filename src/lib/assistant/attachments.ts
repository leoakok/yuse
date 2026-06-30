import type {
  AssistantAttachmentPayload,
  AssistantMessage,
  ComposerAttachment,
  MessageAttachment,
} from "@/lib/types/assistant";

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
  ".txt",
] as const;

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const FILE_INPUT_ACCEPT = ACCEPTED_ATTACHMENT_EXTENSIONS.join(",");

const MAX_EXTRACTED_TEXT_LENGTH = 8000;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function isAcceptedFile(file: File): boolean {
  if (
    ACCEPTED_ATTACHMENT_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_ATTACHMENT_MIME_TYPES)[number]
    )
  ) {
    return true;
  }
  const ext = fileExtension(file.name);
  return ACCEPTED_ATTACHMENT_EXTENSIONS.includes(
    ext as (typeof ACCEPTED_ATTACHMENT_EXTENSIONS)[number]
  );
}

export function validateIncomingFiles(
  files: File[],
  currentCount: number
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  let remainingSlots = MAX_ATTACHMENT_COUNT - currentCount;

  for (const file of files) {
    if (remainingSlots <= 0) {
      errors.push(`You can attach up to ${MAX_ATTACHMENT_COUNT} files.`);
      break;
    }

    if (!isAcceptedFile(file)) {
      errors.push(`"${file.name}" is not a supported file type.`);
      continue;
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      errors.push(
        `"${file.name}" is too large. Each file must be ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} or less.`
      );
      continue;
    }

    accepted.push(file);
    remainingSlots -= 1;
  }

  return { accepted, errors };
}

export async function createComposerAttachment(file: File): Promise<ComposerAttachment> {
  const mimeType = file.type || "application/octet-stream";
  const attachment: ComposerAttachment = {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    mimeType,
  };

  if (mimeType.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
    attachment.previewUrl = URL.createObjectURL(file);
  }

  if (mimeType === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    try {
      const text = await file.text();
      attachment.extractedText = text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    } catch {
      // Keep metadata-only if reading fails.
    }
  }

  return attachment;
}

export function revokeAttachmentPreview(attachment: ComposerAttachment): void {
  if (attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

function isImageAttachment(attachment: ComposerAttachment): boolean {
  return (
    attachment.mimeType.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp)$/i.test(attachment.name)
  );
}

function isPdfAttachment(attachment: ComposerAttachment): boolean {
  return attachment.mimeType === "application/pdf" || /\.pdf$/i.test(attachment.name);
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Serialize attachments for the GraphQL mutation (images as base64, text as extracted content). */
export async function serializeAttachmentsForApi(
  attachments: ComposerAttachment[]
): Promise<AssistantAttachmentPayload[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const payload: AssistantAttachmentPayload = {
        name: attachment.name,
        mimeType: attachment.mimeType,
      };

      if (attachment.extractedText) {
        payload.extractedText = attachment.extractedText;
      }

      if (isImageAttachment(attachment) || isPdfAttachment(attachment)) {
        payload.contentBase64 = await fileToBase64(attachment.file);
      }

      return payload;
    })
  );
}

export const ATTACHMENT_SECTION_MARKER = "\n---\nAttached files:";

const ATTACHMENT_LINE_RE = /^(\d+)\.\s+(.+?)\s+\(([^,]+),\s*([^)]+)\)$/;

function parseSizeLabel(label: string): number | undefined {
  const match = label.trim().match(/^([\d.]+)\s*(B|KB|MB)$/i);
  if (!match) return undefined;
  const value = Number.parseFloat(match[1]!);
  if (Number.isNaN(value)) return undefined;
  const unit = match[2]!.toUpperCase();
  if (unit === "B") return Math.round(value);
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value * 1024 * 1024);
}

/** User-visible message text without attachment suffix. */
export function displayMessageText(text: string, attachments: ComposerAttachment[]): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  if (attachments.length > 0) return "Please review the attached files.";
  return "";
}

export function composerAttachmentsToMessageAttachments(
  attachments: ComposerAttachment[]
): MessageAttachment[] {
  return attachments.map((attachment) => ({
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
  }));
}

export function stripAttachmentSection(content: string): string {
  const index = content.indexOf(ATTACHMENT_SECTION_MARKER);
  if (index === -1) return content;
  return content.slice(0, index).trimEnd();
}

export function parseAttachmentsFromContent(content: string): {
  displayText: string;
  attachments: MessageAttachment[];
} | null {
  const index = content.indexOf(ATTACHMENT_SECTION_MARKER);
  if (index === -1) return null;

  const displayText = content.slice(0, index).trimEnd();
  const section = content.slice(index + ATTACHMENT_SECTION_MARKER.length);
  const endMarker = section.lastIndexOf("\n---");
  const body = endMarker === -1 ? section : section.slice(0, endMarker);
  const attachments: MessageAttachment[] = [];

  for (const line of body.split("\n")) {
    const match = line.match(ATTACHMENT_LINE_RE);
    if (!match) continue;
    attachments.push({
      name: match[2]!.trim(),
      mimeType: match[3]!.trim(),
      size: parseSizeLabel(match[4]!),
    });
  }

  if (attachments.length === 0) return null;
  return { displayText, attachments };
}

/** Normalize stored user messages for display (strip legacy attachment suffix). */
export function normalizeUserMessage(message: AssistantMessage): AssistantMessage {
  if (message.role !== "USER") return message;
  if (message.attachments && message.attachments.length > 0) {
    return message;
  }

  const parsed = parseAttachmentsFromContent(message.content);
  if (!parsed) return message;

  return {
    ...message,
    content: parsed.displayText || message.content,
    attachments: parsed.attachments,
  };
}

/** Augment user text with attachment metadata for the assistant API payload. */
export function formatMessageWithAttachments(
  text: string,
  attachments: ComposerAttachment[]
): string {
  const trimmed = text.trim();
  const lines: string[] = [];

  if (trimmed) {
    lines.push(trimmed);
  } else if (attachments.length > 0) {
    lines.push("Please review the attached files.");
  }

  if (attachments.length === 0) {
    return lines.join("\n");
  }

  lines.push("", "---", "Attached files:");
  attachments.forEach((attachment, index) => {
    lines.push(
      `${index + 1}. ${attachment.name} (${attachment.mimeType}, ${formatFileSize(attachment.size)})`
    );
    if (attachment.extractedText) {
      lines.push("Content:");
      lines.push(attachment.extractedText);
    } else if (isImageAttachment(attachment)) {
      lines.push("(Image attached for analysis.)");
    } else if (isPdfAttachment(attachment)) {
      lines.push("(PDF attached, content will be read on the server.)");
    } else {
      lines.push("(Filename and type provided, content not extracted.)");
    }
  });
  lines.push("---");

  return lines.join("\n");
}
