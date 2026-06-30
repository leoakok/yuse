"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, History, Plus, X } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { toast } from "sonner";
import { AssistantComposer } from "@/components/agent/assistant-composer";
import {
  AssistantMessageBubble,
} from "@/components/agent/assistant-message";
import { AssistantThreadHistory } from "@/components/agent/assistant-thread-picker";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import { STARTER_PROMPTS } from "@/lib/cv/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComposerAttachment } from "@/lib/types/assistant";
import { cn } from "@/lib/utils";

export function CvAssistantPanel() {
  const {
    messages,
    threads,
    activeThreadId,
    agentState,
    isLoading,
    isThreadsLoading,
    isOpen,
    setOpen,
    toggleOpen,
    sendMessage,
    editAndResendMessage,
    startNewChat,
    switchThread,
    deleteThread,
    streamingMessageId,
    lastAffectedResumeIds,
  } = useCvAssistant();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [deleteConfirmThreadId, setDeleteConfirmThreadId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingText("");
  }, []);

  const handleEditStart = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  }, []);

  const handleComposerSubmit = useCallback(
    async (text: string, attachments: ComposerAttachment[]) => {
      if (editingMessageId) {
        try {
          await editAndResendMessage(editingMessageId, text);
          cancelEdit();
        } catch {
          // Keep edit state if resend fails.
        }
        return;
      }
      await sendMessage(text, attachments);
    },
    [cancelEdit, editAndResendMessage, editingMessageId, sendMessage]
  );

  useEffect(() => {
    cancelEdit();
  }, [activeThreadId, cancelEdit]);

  const deleteConfirmThread = deleteConfirmThreadId
    ? threads.find((thread) => thread.id === deleteConfirmThreadId)
    : undefined;

  const lastAssistantMessageId = [...messages].reverse().find((m) => m.role === "ASSISTANT")?.id;
  const createdResumeId = lastAffectedResumeIds.at(-1);
  const chatActionsDisabled = isLoading || isThreadsLoading || !activeThreadId;

  async function handleSelectThread(threadId: string) {
    await switchThread(threadId);
    setHistoryOpen(false);
  }

  async function handleDeleteThread(threadId: string) {
    setDeletingThreadId(threadId);
    try {
      const deleted = await deleteThread(threadId);
      if (deleted) {
        toast.success("Chat deleted");
        setDeleteConfirmThreadId(null);
      } else {
        toast.error("Could not delete this chat. Try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message.trim() : "";
      toast.error(
        message && message.length <= 120
          ? message
          : "Could not delete this chat. Try again."
      );
    } finally {
      setDeletingThreadId(null);
    }
  }

  function threadDeleteTitle(thread: (typeof threads)[number]): string {
    const preview = thread.preview?.trim();
    if (preview) {
      return preview.length > 72 ? `${preview.slice(0, 72)}…` : preview;
    }
    return "New chat";
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen ? (
        <div
          className={cn(
            "pointer-events-auto flex h-[min(640px,80dvh)] w-[min(480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-xl"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {historyOpen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setHistoryOpen(false)}
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Back to chat</span>
                </Button>
              ) : null}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {!historyOpen ? (
                  <YuseLogo className="size-5 shrink-0" />
                ) : null}
                <p className="truncate text-sm font-semibold">
                  {historyOpen ? "Past chats" : "Yuse"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={() => {
                  void startNewChat();
                  setHistoryOpen(false);
                }}
                disabled={chatActionsDisabled}
              >
                <Plus className="size-3.5" />
                New chat
              </Button>
              {!historyOpen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={isThreadsLoading}
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="size-4" />
                  <span className="sr-only">Past chats</span>
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)}>
                <X className="size-4" />
                <span className="sr-only">Close Yuse</span>
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            {historyOpen ? (
              <div className="py-2">
                {isThreadsLoading ? (
                  <p className="py-4 text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <AssistantThreadHistory
                    threads={threads}
                    activeThreadId={activeThreadId}
                    onSelectThread={(threadId) => void handleSelectThread(threadId)}
                    onDeleteRequest={setDeleteConfirmThreadId}
                    deletingThreadId={deletingThreadId}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {isThreadsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : messages.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Create or edit a CV, tailor for a role, or update your twin.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STARTER_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          disabled={chatActionsDisabled}
                          className="rounded-full border px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <AssistantMessageBubble
                      key={message.id}
                      message={message}
                      actionsDisabled={chatActionsDisabled}
                      isBeingEdited={message.id === editingMessageId}
                      onEditStart={handleEditStart}
                      liveActivities={
                        message.id === streamingMessageId ? agentState.activities : undefined
                      }
                      liveStatusLabel={
                        message.id === streamingMessageId ? agentState.label : undefined
                      }
                      createdResumeId={
                        message.id === lastAssistantMessageId && typeof createdResumeId === "string"
                          ? createdResumeId
                          : undefined
                      }
                      isStreaming={message.id === streamingMessageId && isLoading}
                    />
                  ))
                )}
              </div>
            )}
          </ScrollArea>

          {!historyOpen ? (
            <div className="border-t p-3">
              <AssistantComposer
                key={editingMessageId ?? "compose"}
                onSubmit={handleComposerSubmit}
                isLoading={isLoading || isThreadsLoading || !activeThreadId}
                value={editingMessageId ? editingText : undefined}
                onValueChange={editingMessageId ? setEditingText : undefined}
                isEditing={Boolean(editingMessageId)}
                onCancelEdit={cancelEdit}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={deleteConfirmThreadId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingThreadId) setDeleteConfirmThreadId(null);
        }}
      >
        <DialogContent showCloseButton={!deletingThreadId}>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              {deleteConfirmThread
                ? `"${threadDeleteTitle(deleteConfirmThread)}" will be removed permanently. This cannot be undone.`
                : "This chat will be removed permanently. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(deletingThreadId)}
              onClick={() => setDeleteConfirmThreadId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
              disabled={!deleteConfirmThreadId || Boolean(deletingThreadId)}
              onClick={() => {
                if (deleteConfirmThreadId) void handleDeleteThread(deleteConfirmThreadId);
              }}
            >
              {deletingThreadId ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        className="pointer-events-auto size-12 rounded-full shadow-lg"
        onClick={toggleOpen}
        aria-label={isOpen ? "Close Yuse" : "Open Yuse"}
      >
        <YuseLogo className="size-6" />
      </Button>
    </div>
  );
}
