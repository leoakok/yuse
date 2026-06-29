"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  AssistantContext,
  AssistantMessage,
  AssistantActionLog,
  AssistantThread,
  AgentState,
  ComposerAttachment,
} from "@/lib/types/assistant";
import type { ResumeWithContent } from "@/lib/types/cv";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { buildAgentSteps, createInitialAgentState } from "@/lib/assistant/state";
import { AGENT_PHASE_LABELS } from "@/lib/types/assistant";
import {
  composerAttachmentsToMessageAttachments,
  displayMessageText,
  formatMessageWithAttachments,
  normalizeUserMessage,
  serializeAttachmentsForApi,
} from "@/lib/assistant/attachments";
import {
  createAssistantThread,
  deleteAssistantThread,
  getAssistantMessages,
  getAssistantThreads,
} from "@/lib/api/cv-api";
import { streamAssistantMessage } from "@/lib/api/assistant-stream";
import { toast } from "sonner";
import {
  getActiveAssistantThreadId,
  setActiveAssistantThreadId,
  setLastOpenedResumeId,
} from "@/lib/cv/preferences";
import { resumePath } from "@/lib/cv/routes";
import { portfolioPath } from "@/lib/portfolio/routes";
import { useWorkspace } from "@/components/layout/workspace-provider";

interface CvAssistantContextValue {
  messages: AssistantMessage[];
  threads: AssistantThread[];
  activeThreadId: string | null;
  agentState: AgentState;
  isLoading: boolean;
  isThreadsLoading: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  sendMessage: (
    text: string,
    attachments?: ComposerAttachment[],
    options?: {
      historyPrefix?: AssistantMessage[];
      contextOverride?: AssistantContext;
      threadId?: string;
    }
  ) => Promise<void>;
  editAndResendMessage: (messageId: string, newText: string) => Promise<void>;
  startNewChat: () => Promise<AssistantThread>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<boolean>;
  context: AssistantContext;
  refreshKey: number;
  lastActionLogs: AssistantActionLog[];
  resumeContentPatch: ResumeWithContent | null;
  portfolioContentPatch: PortfolioWithContent | null;
  streamingMessageId: string | null;
  lastAffectedResumeIds: string[];
  lastAffectedPortfolioIds: string[];
}

const CvAssistantContext = createContext<CvAssistantContextValue | null>(null);

function deriveContext(pathname: string): AssistantContext {
  if (pathname === "/job-tracker" || pathname.startsWith("/job-tracker/")) {
    return { view: "job_tracker" };
  }
  if (pathname === "/digital-twin" || pathname.startsWith("/digital-twin/")) {
    return { view: "digital_twin" };
  }
  const portfolioMatch = pathname.match(/^\/portfolios\/([^/]+)/);
  if (portfolioMatch) {
    return { view: "portfolio_detail", portfolioId: portfolioMatch[1] };
  }
  if (pathname === "/portfolios" || pathname.startsWith("/portfolios/")) {
    return { view: "portfolios" };
  }
  const resumeMatch = pathname.match(/^\/resumes\/([^/]+)/);
  if (resumeMatch) {
    return { view: "resume_detail", resumeId: resumeMatch[1] };
  }
  if (pathname.startsWith("/resumes/")) {
    return { view: "resume_detail", resumeId: pathname.split("/")[2] };
  }
  return { view: "resumes" };
}

export function CvAssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useWorkspace();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [threads, setThreads] = useState<AssistantThread[]>([]);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>(createInitialAgentState);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadsLoading, setIsThreadsLoading] = useState(true);
  const [isOpen, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastActionLogs, setLastActionLogs] = useState<AssistantActionLog[]>([]);
  const [resumeContentPatch, setResumeContentPatch] = useState<ResumeWithContent | null>(null);
  const [portfolioContentPatch, setPortfolioContentPatch] = useState<PortfolioWithContent | null>(
    null
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [lastAffectedResumeIds, setLastAffectedResumeIds] = useState<string[]>([]);
  const [lastAffectedPortfolioIds, setLastAffectedPortfolioIds] = useState<string[]>([]);

  const context = useMemo(() => deriveContext(pathname), [pathname]);

  useEffect(() => {
    setResumeContentPatch(null);
    setPortfolioContentPatch(null);
  }, [pathname]);

  const loadMessagesForThread = useCallback(async (threadId: string) => {
    const nextMessages = await getAssistantMessages(threadId);
    setMessages(nextMessages.map(normalizeUserMessage));
    setLastActionLogs([]);
    setLastAffectedResumeIds([]);
  }, []);

  const activateThread = useCallback(
    async (threadId: string) => {
      setActiveThreadIdState(threadId);
      setActiveAssistantThreadId(user.id, threadId);
      await loadMessagesForThread(threadId);
    },
    [loadMessagesForThread, user.id]
  );

  const refreshThreads = useCallback(async () => {
    const nextThreads = await getAssistantThreads();
    setThreads(nextThreads);
    return nextThreads;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapThreads() {
      setIsThreadsLoading(true);
      try {
        const nextThreads = await refreshThreads();
        if (cancelled) return;

        const storedThreadId = getActiveAssistantThreadId(user.id);
        const storedThread = storedThreadId
          ? nextThreads.find((thread) => thread.id === storedThreadId)
          : undefined;
        const fallbackThread = nextThreads[0];

        if (storedThread) {
          await activateThread(storedThread.id);
        } else if (fallbackThread) {
          await activateThread(fallbackThread.id);
        } else {
          const created = await createAssistantThread();
          if (cancelled) return;
          setThreads([created]);
          await activateThread(created.id);
        }
      } finally {
        if (!cancelled) {
          setIsThreadsLoading(false);
        }
      }
    }

    void bootstrapThreads();
    return () => {
      cancelled = true;
    };
  }, [activateThread, refreshThreads, user.id]);

  const startNewChat = useCallback(async () => {
    if (isLoading) {
      const existing = threads.find((thread) => thread.id === activeThreadId);
      if (existing) return existing;
    }
    const thread = await createAssistantThread();
    setThreads((current) => [thread, ...current]);
    setMessages([]);
    setLastActionLogs([]);
    setLastAffectedResumeIds([]);
    setActiveThreadIdState(thread.id);
    setActiveAssistantThreadId(user.id, thread.id);
    setOpen(true);
    return thread;
  }, [activeThreadId, isLoading, threads, user.id]);

  const switchThread = useCallback(
    async (threadId: string) => {
      if (isLoading || threadId === activeThreadId) return;
      await activateThread(threadId);
      setOpen(true);
    },
    [activateThread, activeThreadId, isLoading]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (isLoading) return false;
      const deleted = await deleteAssistantThread(threadId);
      if (!deleted) return false;

      const remaining = threads.filter((thread) => thread.id !== threadId);
      setThreads(remaining);

      if (threadId === activeThreadId) {
        setLastActionLogs([]);
        setLastAffectedResumeIds([]);
        if (remaining.length > 0) {
          await activateThread(remaining[0].id);
        } else {
          const thread = await createAssistantThread();
          setThreads([thread]);
          await activateThread(thread.id);
        }
      }
      return true;
    },
    [activateThread, activeThreadId, isLoading, threads]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      attachments: ComposerAttachment[] = [],
      options?: {
        historyPrefix?: AssistantMessage[];
        contextOverride?: AssistantContext;
        threadId?: string;
      }
    ) => {
      const effectiveContext = options?.contextOverride ?? context;
      const threadId = options?.threadId ?? activeThreadId;
      const displayContent = displayMessageText(text, attachments);
      const apiContent = formatMessageWithAttachments(text, attachments);
      if (!apiContent.trim() || !threadId) return;

      setIsLoading(true);
      setOpen(true);
      const hasAttachments = attachments.length > 0;
      const messageAttachments = composerAttachmentsToMessageAttachments(attachments);
      const streamId = `stream-${Date.now()}`;
      const now = new Date().toISOString();

      setMessages((current) => [
        ...current,
        {
          id: `user-${streamId}`,
          threadId,
          role: "USER",
          content: displayContent,
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
          createdAt: now,
        },
        {
          id: streamId,
          threadId,
          role: "ASSISTANT",
          content: "",
          createdAt: now,
        },
      ]);
      setStreamingMessageId(streamId);

      try {
        if (hasAttachments) {
          setAgentState({
            phase: "preparing",
            label: AGENT_PHASE_LABELS.preparing,
            steps: buildAgentSteps("prepare", [], true),
            activities: [],
          });
        }

        const attachmentPayload = await serializeAttachmentsForApi(attachments);

        setAgentState({
          phase: "sending",
          label: AGENT_PHASE_LABELS.sending,
          steps: buildAgentSteps(
            "send",
            hasAttachments ? ["prepare"] : [],
            hasAttachments
          ),
          activities: [],
        });

        const result = await streamAssistantMessage(
          threadId,
          apiContent,
          effectiveContext,
          attachmentPayload,
          {
            hadComposerAttachments: hasAttachments,
            onStateChange: setAgentState,
            onDelta: (delta) => {
              setMessages((current) =>
                current.map((message) =>
                  message.id === streamId
                    ? { ...message, content: message.content + delta }
                    : message
                )
              );
            },
            onResumePatch: (resume) => {
              setResumeContentPatch(resume);
              if (context.view === "resumes") {
                setRefreshKey((k) => k + 1);
              }
            },
            onPortfolioPatch: (portfolio) => {
              setPortfolioContentPatch(portfolio);
              if (context.view === "portfolios") {
                setRefreshKey((k) => k + 1);
              }
            },
          }
        );

        const normalizedTurn = result.messages.map(normalizeUserMessage);
        if (options?.historyPrefix) {
          const newTurn = normalizedTurn.slice(-2);
          setMessages([...options.historyPrefix, ...newTurn]);
        } else {
          setMessages(normalizedTurn);
        }
        setLastActionLogs(result.actionLogs);
        setLastAffectedResumeIds(result.affectedResumeIds);
        setLastAffectedPortfolioIds(result.affectedPortfolioIds);
        if (result.resumeWithContent) {
          setResumeContentPatch(result.resumeWithContent);
        }
        if (result.portfolioWithContent) {
          setPortfolioContentPatch(result.portfolioWithContent);
        }
        if (
          result.affectedResumeIds.length > 0 ||
          result.affectedPortfolioIds.length > 0 ||
          result.actionLogs.some((log) => log.success) ||
          effectiveContext.view === "digital_twin" ||
          effectiveContext.view === "job_tracker"
        ) {
          setRefreshKey((k) => k + 1);
        }

        const updatedThreads = await refreshThreads();
        setThreads(updatedThreads);

        const createdPortfolioId = result.affectedPortfolioIds.at(-1);
        if (createdPortfolioId) {
          if (context.view === "portfolios") {
            router.push(portfolioPath(createdPortfolioId));
          }
        } else {
          const createdResumeId = result.affectedResumeIds.at(-1);
          if (createdResumeId) {
            setLastOpenedResumeId(user.id, createdResumeId);
            if (context.view === "resumes") {
              router.push(resumePath(createdResumeId));
            }
          } else if (context.resumeId) {
            setLastOpenedResumeId(user.id, context.resumeId);
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Yuse could not finish that request. Try again."
        );
        throw error;
      } finally {
        setStreamingMessageId(null);
        setIsLoading(false);
        setAgentState(createInitialAgentState());
      }
    },
    [activeThreadId, context, refreshThreads, router, user.id]
  );

  const editAndResendMessage = useCallback(
    async (messageId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed || isLoading || !activeThreadId) return;

      let shouldResend = false;
      let prefix: AssistantMessage[] = [];
      setMessages((current) => {
        const index = current.findIndex((message) => message.id === messageId);
        if (index === -1 || current[index]?.role !== "USER") {
          return current;
        }
        shouldResend = true;
        prefix = current.slice(0, index);
        return prefix;
      });

      if (!shouldResend) return;
      await sendMessage(trimmed, [], { historyPrefix: prefix });
    },
    [activeThreadId, isLoading, sendMessage]
  );

  const value = useMemo(
    () => ({
      messages,
      threads,
      activeThreadId,
      agentState,
      isLoading,
      isThreadsLoading,
      isOpen,
      setOpen,
      toggleOpen: () => setOpen((o) => !o),
      sendMessage,
      editAndResendMessage,
      startNewChat,
      switchThread,
      deleteThread,
      context,
      refreshKey,
      lastActionLogs,
      resumeContentPatch,
      portfolioContentPatch,
      streamingMessageId,
      lastAffectedResumeIds,
      lastAffectedPortfolioIds,
    }),
    [
      messages,
      threads,
      activeThreadId,
      agentState,
      isLoading,
      isThreadsLoading,
      isOpen,
      sendMessage,
      editAndResendMessage,
      startNewChat,
      switchThread,
      deleteThread,
      context,
      refreshKey,
      lastActionLogs,
      resumeContentPatch,
      portfolioContentPatch,
      streamingMessageId,
      lastAffectedResumeIds,
      lastAffectedPortfolioIds,
    ]
  );

  return (
    <CvAssistantContext.Provider value={value}>{children}</CvAssistantContext.Provider>
  );
}

export function useCvAssistant() {
  const ctx = useContext(CvAssistantContext);
  if (!ctx) {
    throw new Error("useCvAssistant must be used within CvAssistantProvider");
  }
  return ctx;
}
