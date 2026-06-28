const LAST_OPENED_RESUME_KEY_PREFIX = "cv:lastOpenedResumeId";
const LEGACY_LAST_OPENED_RESUME_KEY = "cv:lastOpenedResumeId";

function lastOpenedResumeKey(userId: string) {
  return `${LAST_OPENED_RESUME_KEY_PREFIX}:${userId}`;
}

export function getLastOpenedResumeId(userId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(lastOpenedResumeKey(userId)) ?? undefined;
}

export function setLastOpenedResumeId(userId: string, resumeId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(lastOpenedResumeKey(userId), resumeId);
}

export function clearLastOpenedResumeId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(lastOpenedResumeKey(userId));
}

/** Removes pre-auth-scoping key that could point at another user's demo resume. */
export function clearLegacyLastOpenedResumePreference(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_LAST_OPENED_RESUME_KEY);
}

const ACTIVE_ASSISTANT_THREAD_KEY_PREFIX = "cv:activeAssistantThreadId";

function activeAssistantThreadKey(userId: string) {
  return `${ACTIVE_ASSISTANT_THREAD_KEY_PREFIX}:${userId}`;
}

export function getActiveAssistantThreadId(userId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(activeAssistantThreadKey(userId)) ?? undefined;
}

export function setActiveAssistantThreadId(userId: string, threadId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(activeAssistantThreadKey(userId), threadId);
}
