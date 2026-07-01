"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, History, PanelRightClose, Plus } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { toast } from "sonner";
import { AssistantComposer } from "@/components/agent/assistant-composer";
import { AssistantMessageBubble } from "@/components/agent/assistant-message";
import { AssistantThreadHistory } from "@/components/agent/assistant-thread-picker";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import { WELCOME_PATH } from "@/components/agent/cv-assistant-shell";
import {
  ASSISTANT_DEFAULT,
  ASSISTANT_KEY,
  ASSISTANT_MAX,
  ASSISTANT_MIN,
  ResizeHandle,
  clamp,
  useStoredWidth,
} from "@/components/layout/resize-handle";
import {
  ShellAside,
  WorkspacePanel,
  WorkspacePanelBody,
  WorkspacePanelFloatingFooter,
  WorkspacePanelHeader,
} from "@/components/layout/workspace-panel";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ComposerAttachment } from "@/lib/types/assistant";
import {
  floatingChipIconButtonClassName,
  floatingChipTextButtonClassName,
} from "@/lib/ui/floating-chip";
import { motionTransitionColors } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

function AssistantCollapsedRail({ onOpen }: { onOpen: () => void }) {
  return (
    <aside className="flex h-full w-12 shrink-0 flex-col items-center border-l bg-muted/10 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={onOpen}
        aria-label="Open Yuse"
      >
        <YuseLogo className="size-5" />
      </Button>
    </aside>
  );
}

export function CvAssistantPanel() {
  const pathname = usePathname() ?? "";
  const [assistantWidth, setAssistantWidth] = useStoredWidth(ASSISTANT_KEY, ASSISTANT_DEFAULT);
  const {
    messages,
    threads,
    activeThreadId,
    agentState,
    isLoading,
    isThreadsLoading,
    isOpen,
    setOpen,
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
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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

  useEffect(() => {
    if (pathname === WELCOME_PATH && isOpen) {
      setOpen(false);
    }
  }, [isOpen, pathname, setOpen]);

  if (pathname === WELCOME_PATH) {
    return null;
  }

  const panelContent = (
    <WorkspacePanel>
      <WorkspacePanelBody>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <WorkspacePanelHeader
            variant="floating"
            scrollFog
            className="px-3"
            trailing={
              <>
                {historyOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={floatingChipIconButtonClassName}
                    onClick={() => setHistoryOpen(false)}
                  >
                    <ArrowLeft className="size-4" />
                    <span className="sr-only">Back to chat</span>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className={floatingChipTextButtonClassName}
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
                    className={floatingChipIconButtonClassName}
                    disabled={isThreadsLoading}
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History className="size-4" />
                    <span className="sr-only">Past chats</span>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className={floatingChipIconButtonClassName}
                  onClick={() => setOpen(false)}
                >
                  <PanelRightClose className="size-4" />
                  <span className="sr-only">Hide assistant</span>
                </Button>
              </>
            }
          />
          <div className={cn("w-full px-3", !historyOpen && "pb-32")}>
            {historyOpen ? (
              <div className="py-2">
                <h2 className="mb-3 text-sm font-semibold">Past chats</h2>
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
              <div className="space-y-4 py-2">
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
                          className={cn(
                            "rounded-full border px-3 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
                            motionTransitionColors
                          )}
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
          </div>

          {!historyOpen ? (
            <WorkspacePanelFloatingFooter scrollFog>
              <AssistantComposer
                key={editingMessageId ?? "compose"}
                onSubmit={handleComposerSubmit}
                isLoading={isLoading || isThreadsLoading || !activeThreadId}
                value={editingMessageId ? editingText : undefined}
                onValueChange={editingMessageId ? setEditingText : undefined}
                isEditing={Boolean(editingMessageId)}
                onCancelEdit={cancelEdit}
              />
            </WorkspacePanelFloatingFooter>
          ) : null}
        </div>
      </WorkspacePanelBody>
    </WorkspacePanel>
  );

  return (
    <>
      {!isOpen ? <AssistantCollapsedRail onOpen={() => setOpen(true)} /> : null}

      {isOpen ? (
        <ResizeHandle
          label="Resize assistant"
          className="hidden lg:block"
          onResize={(delta) =>
            setAssistantWidth((width) => clamp(width - delta, ASSISTANT_MIN, ASSISTANT_MAX))
          }
        />
      ) : null}

      {isOpen ? (
        <ShellAside width={assistantWidth} className="h-full">
          {panelContent}
        </ShellAside>
      ) : null}

      <Sheet open={isOpen && !isLargeScreen} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full w-[min(480px,calc(100vw-3rem))] max-w-[480px] flex-col gap-0 p-0 sm:max-w-[480px] lg:hidden"
        >
          {panelContent}
        </SheetContent>
      </Sheet>

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
              variant="warning"
              disabled={Boolean(deletingThreadId)}
              onClick={() => {
                if (deleteConfirmThreadId) void handleDeleteThread(deleteConfirmThreadId);
              }}
            >
              {deletingThreadId ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
