import type { AgentActivity, AgentProgressStep, AgentState } from "@/lib/types/assistant";
import { AGENT_PHASE_LABELS, WORKFLOW_STEP_DEFS } from "@/lib/types/assistant";

export function workflowSteps(includePrepare: boolean): Omit<AgentProgressStep, "status">[] {
  if (includePrepare) {
    return WORKFLOW_STEP_DEFS;
  }
  return WORKFLOW_STEP_DEFS.filter((step) => step.id !== "prepare");
}

export function buildAgentSteps(
  activeStepId: string | null,
  completedStepIds: string[],
  includePrepare: boolean
): AgentProgressStep[] {
  const completed = new Set(completedStepIds);
  return workflowSteps(includePrepare).map((step) => ({
    ...step,
    status: completed.has(step.id)
      ? "complete"
      : step.id === activeStepId
        ? "active"
        : "pending",
  }));
}

export function createInitialAgentState(): AgentState {
  return {
    phase: "idle",
    label: AGENT_PHASE_LABELS.idle,
    steps: buildAgentSteps(null, [], false),
    activities: [],
  };
}

let activityCounter = 0;

export function nextActivityId(tool: string): string {
  activityCounter += 1;
  return `${tool}-${Date.now()}-${activityCounter}`;
}

export function appendActivity(
  activities: AgentActivity[],
  activity: AgentActivity
): AgentActivity[] {
  return [...activities, activity];
}

export function completeActivity(
  activities: AgentActivity[],
  tool: string,
  label: string,
  status: "complete" | "error"
): AgentActivity[] {
  const next = [...activities];
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (next[i].tool === tool && next[i].status === "active") {
      next[i] = { ...next[i], label, status };
      return next;
    }
  }
  return appendActivity(next, {
    id: nextActivityId(tool),
    tool,
    label,
    status,
  });
}
