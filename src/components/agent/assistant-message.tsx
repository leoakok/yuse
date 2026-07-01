"use client";

import Link from "next/link";
import type { AgentActivity, AssistantMessage } from "@/lib/types/assistant";
import {
  AgentActivityFeed,
  isThinkingLabel,
  LiveStatusLine,
  ThinkingCollapsible,
} from "@/components/agent/agent-activity-feed";
import { AssistantAttachmentChips } from "@/components/agent/assistant-attachment-chips";
import { AssistantMessageContent } from "@/lib/assistant/markdown";
import { stripAttachmentSection } from "@/lib/assistant/attachments";
import { resumePath } from "@/lib/cv/routes";
import { Button } from "@/components/ui/button";
import { Copy, Pencil } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { toast } from "sonner";
import { motionEnterFadeUp, motionHoverReveal, motionHoverRevealGroup } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

interface AssistantMessageBubbleProps {
  message: AssistantMessage;
  liveActivities?: AgentActivity[];
  liveStatusLabel?: string;
  createdResumeId?: string;
  isStreaming?: boolean;
  isBeingEdited?: boolean;
  actionsDisabled?: boolean;
  onEditStart?: (messageId: string, text: string) => void;
}

export function userMessageEditableText(content: string): string {
  return stripAttachmentSection(content);
}

export function AssistantMessageBubble({
  message,
  liveActivities = [],
  liveStatusLabel,
  createdResumeId,
  isStreaming = false,
  isBeingEdited = false,
  actionsDisabled = false,
  onEditStart,
}: AssistantMessageBubbleProps) {
  const isUser = message.role === "USER";
  const canEdit = isUser && !actionsDisabled && Boolean(onEditStart);
  const canCopy = !isUser && !isStreaming && Boolean(message.content);

  async function handleCopy() {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function handleEditStart() {
    if (!onEditStart) return;
    onEditStart(message.id, userMessageEditableText(message.content));
  }

  if (isUser) {
    const displayText = userMessageEditableText(message.content);
    const attachments = message.attachments ?? [];

    return (
      <div className={cn("group flex w-full justify-end", motionEnterFadeUp)}>
        <div className="flex w-full min-w-0 flex-col items-end gap-1">
          <div
            className={cn(
              "max-w-full rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground",
              isBeingEdited && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
            )}
          >
            {displayText ? <p>{displayText}</p> : null}
            {attachments.length > 0 ? (
              <AssistantAttachmentChips
                attachments={attachments}
                variant="message"
                className={displayText ? "mt-2" : undefined}
              />
            ) : null}
          </div>
          {canEdit ? (
            <div className={cn("flex items-center", motionHoverReveal)}>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label="Edit message"
                onClick={handleEditStart}
              >
                <Pencil className="size-3" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const showThinking =
    isStreaming && isThinkingLabel(liveStatusLabel);
  const showToolSteps = isStreaming && liveActivities.length > 0;
  const showMiscStatus =
    isStreaming &&
    Boolean(liveStatusLabel) &&
    !isThinkingLabel(liveStatusLabel) &&
    !liveActivities.some((activity) => activity.status === "active");
  const hasLiveActivity = showThinking || showToolSteps || showMiscStatus;
  const showContent = Boolean(message.content) || !isStreaming;

  return (
    <div className={cn("group/msg w-full min-w-0", motionEnterFadeUp)}>
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-md bg-primary/10">
          <YuseLogo className="size-4" />
        </span>
        <span className="font-medium">Yuse</span>
        {isStreaming && !hasLiveActivity ? (
          <span className="text-muted-foreground">Working…</span>
        ) : null}
      </div>

      {showThinking ? (
        <ThinkingCollapsible
          label={liveStatusLabel}
          isActive
          className="sticky top-0 z-10 mb-2 bg-background/95"
        />
      ) : null}
      {showToolSteps ? (
        <AgentActivityFeed
          activities={liveActivities}
          className="sticky top-0 z-10 mb-2 bg-background/95"
        />
      ) : null}
      {showMiscStatus && liveStatusLabel ? (
        <LiveStatusLine
          label={liveStatusLabel}
          className="sticky top-0 z-10 mb-2 bg-background/95"
        />
      ) : null}

      {showContent ? (
        <div className="rounded-xl border bg-card px-3 py-3 shadow-sm">
          {message.content ? (
            <AssistantMessageContent content={message.content} />
          ) : isStreaming ? (
            <p className="text-sm text-muted-foreground">Working…</p>
          ) : null}
          {createdResumeId ? (
            <p className="mt-3 text-sm">
              <Link
                href={resumePath(createdResumeId)}
                className="font-medium text-primary hover:underline"
              >
                Open your new resume
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {canCopy ? (
        <div className={cn("mt-1 flex items-center", motionHoverRevealGroup("msg"))}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label="Copy reply"
            onClick={() => void handleCopy()}
          >
            <Copy className="size-3" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
