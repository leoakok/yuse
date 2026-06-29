export type AssistantMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type AssistantView =
  | "resumes"
  | "sections"
  | "items"
  | "resume_detail"
  | "portfolios"
  | "portfolio_detail"
  | "digital_twin"
  | "job_tracker";

export interface AssistantContext {
  view: AssistantView;
  resumeId?: string;
  portfolioId?: string;
  sectionId?: string;
  sectionItemId?: string;
  jobId?: string;
}

export interface AssistantThread {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
}

/** Attachment metadata shown on sent user messages (no file blob). */
export interface MessageAttachment {
  name: string;
  mimeType: string;
  size?: number;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  role: AssistantMessageRole;
  content: string;
  attachments?: MessageAttachment[];
  context?: AssistantContext;
  createdAt: string;
}

export interface AssistantActionLog {
  id: string;
  messageId: string;
  op: string;
  payload: Record<string, unknown>;
  success: boolean;
  error?: string;
  createdAt: string;
}

export interface AssistantTurnResult {
  messages: AssistantMessage[];
  actionLogs: AssistantActionLog[];
  affectedResumeIds: string[];
  affectedPortfolioIds: string[];
  resumeWithContent?: import("@/lib/types/cv").ResumeWithContent;
  portfolioWithContent?: import("@/lib/types/portfolio").PortfolioWithContent;
}

export type AgentPhase =
  | "idle"
  | "preparing"
  | "sending"
  | "thinking"
  | "ready"
  | "error";

export interface AgentProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete";
}

export interface AgentState {
  phase: AgentPhase;
  label: string;
  steps: AgentProgressStep[];
  activities: AgentActivity[];
}

export type AgentActivityStatus = "active" | "complete" | "error";

export interface AgentActivity {
  id: string;
  label: string;
  tool?: string;
  status: AgentActivityStatus;
}

export const AGENT_PHASE_LABELS: Record<AgentPhase, string> = {
  idle: "Ready",
  preparing: "Preparing attachments",
  sending: "Sending",
  thinking: "Thinking",
  ready: "Done",
  error: "Something went wrong",
};

export const WORKFLOW_STEP_DEFS: Omit<AgentProgressStep, "status">[] = [
  { id: "prepare", label: "Preparing attachments" },
  { id: "send", label: "Sending request" },
  { id: "think", label: "Thinking" },
];

/** Client-side file staged in the assistant composer before send. */
export interface ComposerAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  previewUrl?: string;
  /** Populated for plain-text files; other types are metadata-only until backend parsing. */
  extractedText?: string;
}

/** Attachment payload sent to the assistant API. */
export interface AssistantAttachmentPayload {
  name: string;
  mimeType: string;
  contentBase64?: string;
  extractedText?: string;
}
