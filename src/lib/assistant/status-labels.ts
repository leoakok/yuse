/** Maps backend / legacy status strings to plain Yuse voice. */
const STATUS_LABEL_MAP: Record<string, string> = {
  "Waiting for model capacity…": "Give me a moment — getting ready…",
  "Waiting for model capacity...": "Give me a moment — getting ready…",
  "Continuing resume population…": "Still building your resume…",
  "Continuing resume population...": "Still building your resume…",
  "Finishing job application…": "Wrapping up your application…",
  "Finishing job application...": "Wrapping up your application…",
  "Saving resume to workspace…": "Saving your resume…",
  "Saving resume to workspace...": "Saving your resume…",
  "Importing from website…": "Pulling in info from that site…",
  "Importing from website...": "Pulling in info from that site…",
  "Fixing structured fields…": "Cleaning up the details…",
  "Fixing structured fields...": "Cleaning up the details…",
  Thinking: "Give me a moment…",
  "Thinking…": "Give me a moment…",
  "Preparing attachments": "Getting your files ready…",
  Sending: "Sending your message…",
  "Sending request": "Sending your message…",
};

const TECHNICAL_STATUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /rate\s*limit|429|too many requests/i, label: "Busy right now — trying again…" },
  { pattern: /model capacity|capacity|queue/i, label: "Give me a moment — getting ready…" },
  { pattern: /retry|backoff|throttl/i, label: "One sec, trying again…" },
  { pattern: /openai|llm|token limit|context length/i, label: "Working on it…" },
];

/** User-facing label for live assistant status lines. */
export function humanizeStatusLabel(label: string | undefined): string | undefined {
  if (!label?.trim()) return label;

  const mapped = STATUS_LABEL_MAP[label.trim()];
  if (mapped) return mapped;

  for (const { pattern, label: friendly } of TECHNICAL_STATUS_PATTERNS) {
    if (pattern.test(label)) return friendly;
  }

  return label;
}

/** Whether a status should appear in the thinking collapsible (not a tool / save step). */
export function isThinkingStatusLabel(label: string | undefined): boolean {
  const humanized = humanizeStatusLabel(label);
  if (!humanized) return false;

  const normalized = humanized.toLowerCase().replace(/…/g, "").replace(/\./g, "").trim();
  if (normalized === "thinking") return true;
  if (normalized.startsWith("give me a moment")) return true;
  if (normalized.startsWith("one sec")) return true;
  if (normalized.includes("getting ready")) return true;
  if (normalized.startsWith("busy right now")) return true;
  if (normalized === "working on it") return true;

  return false;
}

/** Plain-language message when the assistant stream fails. */
export function humanizeAssistantError(message: string): string {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "not found" || lower.endsWith(" not found")) {
    return "That item could not be found.";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return "Yuse is a little busy right now. Give it a moment and try again.";
  }
  if (lower.includes("model capacity") || lower.includes("queue")) {
    return "Yuse is getting ready. Try again in a moment.";
  }
  if (lower.includes("context length") || lower.includes("token")) {
    return "That message was too long for one go. Try a shorter request.";
  }
  if (lower.includes("openai") || lower.includes("llm")) {
    return "Yuse could not finish that request. Try again.";
  }
  return message;
}
