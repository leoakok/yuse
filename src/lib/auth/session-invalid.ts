import { SessionInvalidError } from "@/lib/graphql/client";
import { clearLegacyLastOpenedResumePreference } from "@/lib/cv/preferences";

let signingOut = false;

const USER_SCOPED_STORAGE_PREFIXES = [
  "cv:lastOpenedResumeId:",
  "cv:activeAssistantThreadId:",
] as const;

function isSessionRelatedError(error: unknown): boolean {
  if (error instanceof SessionInvalidError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("unauthorized") ||
      message.includes("session invalid") ||
      message.includes("session required")
    );
  }
  return false;
}

export function isSigningOut(): boolean {
  return signingOut;
}

export function resetSigningOutState(): void {
  signingOut = false;
}

function clearSessionCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearLegacyLastOpenedResumePreference();

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && USER_SCOPED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

async function signOutOnSessionExpired(): Promise<void> {
  if (signingOut || typeof window === "undefined") {
    return;
  }

  signingOut = true;
  clearSessionCache();

  const { toast } = await import("sonner");
  toast.error("Session expired");

  const { signOut } = await import("next-auth/react");
  void signOut({ callbackUrl: "/login" });
}

/** Signs out when a request fails due to an invalid or expired session. */
export async function handleSessionInvalid(error: unknown): Promise<boolean> {
  if (!isSessionRelatedError(error)) {
    return false;
  }

  await signOutOnSessionExpired();
  return true;
}

/** Signs out after workspace bootstrap fails due to an invalid session. */
export async function handleWorkspaceLoadFailure(error?: unknown): Promise<boolean> {
  if (!isSessionRelatedError(error)) {
    return false;
  }
  await signOutOnSessionExpired();
  return true;
}
