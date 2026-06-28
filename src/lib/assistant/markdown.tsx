"use client";

import { MarkdownContent } from "@/lib/markdown/render";
import { cn } from "@/lib/utils";

interface AssistantMessageContentProps {
  content: string;
  className?: string;
}

export function AssistantMessageContent({ content, className }: AssistantMessageContentProps) {
  return (
    <MarkdownContent
      content={content}
      className={cn("space-y-3 text-sm leading-relaxed text-foreground/90", className)}
    />
  );
}
