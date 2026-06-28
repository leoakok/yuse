import type {
  AgentState,
  AssistantAttachmentPayload,
  AssistantContext,
  AssistantTurnResult,
} from "@/lib/types/assistant";
import type { ResumeWithContent } from "@/lib/types/cv";
import { mapResumeWithContent } from "@/lib/api/cv-api";
import { AGENT_PHASE_LABELS } from "@/lib/types/assistant";
import {
  appendActivity,
  buildAgentSteps,
  completeActivity,
  nextActivityId,
} from "@/lib/assistant/state";
import { normalizeUserMessage } from "@/lib/assistant/attachments";
import { describeToolStart } from "@/lib/assistant/tool-activity";

const STREAM_URL = "/api/assistant/stream";

type StreamHandlers = {
  onStateChange?: (state: AgentState) => void;
  onDelta?: (text: string) => void;
  onStatus?: (label: string) => void;
  onResumePatch?: (resume: ResumeWithContent) => void;
  hadComposerAttachments?: boolean;
};

type StreamEvent = {
  type: string;
  label?: string;
  content?: string;
  error?: string;
  result?: Record<string, unknown>;
  tool?: {
    name: string;
    arguments?: Record<string, unknown>;
    success?: boolean;
    error?: string;
    durationMs?: number;
    resultSummary?: string;
    authenticatedAs?: string;
  };
};

function mapAssistantContext(context: AssistantContext) {
  const viewMap = {
    resumes: "RESUMES",
    sections: "SECTIONS",
    items: "ITEMS",
    resume_detail: "RESUME_DETAIL",
    digital_twin: "DIGITAL_TWIN",
    job_tracker: "JOB_TRACKER",
  } as const;

  return {
    view: viewMap[context.view],
    resumeId: context.resumeId,
    sectionId: context.sectionId,
    sectionItemId: context.sectionItemId,
    jobId: context.jobId,
  };
}

function mapAssistantMessage(message: {
  id: string;
  threadId: string;
  role: string;
  content: string;
  createdAt: string;
}) {
  return normalizeUserMessage({
    id: message.id,
    threadId: message.threadId,
    role: message.role as "USER" | "ASSISTANT" | "SYSTEM",
    content: message.content,
    createdAt: message.createdAt,
  });
}

function mapTurnResult(raw: Record<string, unknown>): AssistantTurnResult {
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map((message) =>
        mapAssistantMessage(message as Parameters<typeof mapAssistantMessage>[0])
      )
    : [];

  return {
    messages,
    actionLogs: Array.isArray(raw.actionLogs) ? (raw.actionLogs as AssistantTurnResult["actionLogs"]) : [],
    affectedResumeIds: Array.isArray(raw.affectedResumeIds)
      ? (raw.affectedResumeIds as string[])
      : [],
    resumeWithContent:
      raw.resumeWithContent && typeof raw.resumeWithContent === "object"
        ? mapResumeWithContent(raw.resumeWithContent as Parameters<typeof mapResumeWithContent>[0])
        : undefined,
  };
}

export async function streamAssistantMessage(
  threadId: string,
  content: string,
  context: AssistantContext,
  attachments: AssistantAttachmentPayload[] = [],
  handlers: StreamHandlers = {}
): Promise<AssistantTurnResult> {
  const includePrepare = handlers.hadComposerAttachments ?? false;
  const completedBeforeThink = includePrepare ? ["prepare", "send"] : ["send"];

  handlers.onStateChange?.({
    phase: "thinking",
    label: AGENT_PHASE_LABELS.thinking,
    steps: buildAgentSteps("think", completedBeforeThink, includePrepare),
    activities: [],
  });

  const response = await fetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId,
      text: content,
      context: mapAssistantContext(context),
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        mimeType: attachment.mimeType,
        contentBase64: attachment.contentBase64 ?? null,
        extractedText: attachment.extractedText ?? null,
      })),
    }),
  });

  if (!response.ok || !response.body) {
    handlers.onStateChange?.({
      phase: "error",
      label: AGENT_PHASE_LABELS.error,
      steps: buildAgentSteps(null, completedBeforeThink, includePrepare),
      activities: [],
    });
    throw new Error("Assistant request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let activities: AgentState["activities"] = [];
  let statusLabel = AGENT_PHASE_LABELS.thinking;

  const emitState = (phase: AgentState["phase"] = "thinking") => {
    handlers.onStateChange?.({
      phase,
      label: statusLabel,
      steps: buildAgentSteps("think", completedBeforeThink, includePrepare),
      activities,
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;

      if (event.type === "status" && event.label) {
        statusLabel = event.label;
        handlers.onStatus?.(event.label);
        emitState("thinking");
      }

      if (event.type === "tool_start" && event.tool?.name) {
        const toolName = event.tool.name;
        const args = event.tool.arguments ?? {};
        activities = appendActivity(activities, {
          id: nextActivityId(toolName),
          tool: toolName,
          label: event.label ?? describeToolStart(toolName, args),
          status: "active",
        });
        statusLabel = event.label ?? describeToolStart(toolName, args);
        emitState("thinking");
      }

      if (
        (event.type === "tool_end" || event.type === "tool_error") &&
        event.tool?.name
      ) {
        const toolName = event.tool.name;
        const endLabel =
          event.tool.resultSummary ??
          event.label ??
          (event.tool.error
            ? `${describeToolStart(toolName)} failed`
            : describeToolStart(toolName));
        activities = completeActivity(
          activities,
          toolName,
          endLabel,
          event.type === "tool_error" || event.tool.error ? "error" : "complete"
        );
        emitState("thinking");
      }

      if (event.type === "delta" && event.content) {
        handlers.onDelta?.(event.content);
        emitState("thinking");
      }

      if (event.type === "resume_patch" && event.result?.resumeWithContent) {
        const resume = mapResumeWithContent(
          event.result.resumeWithContent as Parameters<typeof mapResumeWithContent>[0]
        );
        handlers.onResumePatch?.(resume);
      }

      if (event.type === "error") {
        handlers.onStateChange?.({
          phase: "error",
          label: AGENT_PHASE_LABELS.error,
          steps: buildAgentSteps(null, completedBeforeThink, includePrepare),
          activities,
        });
        throw new Error(event.error ?? "Assistant stream failed");
      }

      if (event.type === "done" && event.result) {
        handlers.onStateChange?.({
          phase: "ready",
          label: AGENT_PHASE_LABELS.ready,
          steps: buildAgentSteps(
            null,
            includePrepare ? ["prepare", "send", "think"] : ["send", "think"],
            includePrepare
          ),
          activities,
        });
        return mapTurnResult(event.result);
      }
    }
  }

  throw new Error("Assistant stream ended without a result");
}
