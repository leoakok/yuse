import type {
  AutomationRun,
  JobAutomationRunResult,
  LinkedInJobCard,
} from "@/lib/types/admin";

const STREAM_URL = "/api/automations/run/stream";

export type AutomationRunStepStatus = "running" | "done" | "error";

export type AutomationRunStep = {
  id: string;
  label: string;
  status: AutomationRunStepStatus;
  detail?: Record<string, unknown>;
};

type StreamEvent = {
  type: string;
  id?: string;
  label?: string;
  status?: string;
  detail?: Record<string, unknown>;
  result?: {
    run?: AutomationRun;
    matches?: LinkedInJobCard[];
  };
  error?: string;
};

export type StreamAutomationRunHandlers = {
  onStep?: (step: AutomationRunStep) => void;
};

function mapStepStatus(value: string | undefined): AutomationRunStepStatus {
  if (value === "done" || value === "error") return value;
  return "running";
}

/** Streams a live automation run as NDJSON steps, then returns the final result. */
export async function streamAutomationRun(
  automationId: string,
  handlers: StreamAutomationRunHandlers = {},
): Promise<JobAutomationRunResult> {
  const response = await fetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ automationId }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || "Automation run failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: JobAutomationRunResult | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: StreamEvent;
      try {
        event = JSON.parse(trimmed) as StreamEvent;
      } catch {
        continue;
      }

      if (event.type === "step" && event.id && event.label) {
        handlers.onStep?.({
          id: event.id,
          label: event.label,
          status: mapStepStatus(event.status),
          detail: event.detail,
        });
        continue;
      }

      if (event.type === "error") {
        streamError = event.error || "Automation run failed.";
        continue;
      }

      if (event.type === "done" && event.result?.run) {
        result = {
          run: event.result.run,
          matches: event.result.matches ?? [],
        };
      }
    }
  }

  if (result) {
    return result;
  }
  throw new Error(streamError || "Automation run ended without a result.");
}
