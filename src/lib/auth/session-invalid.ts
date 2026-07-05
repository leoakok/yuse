import { clearAllWorkspaceCache } from "@/lib/cache/workspace-cache";
import { SessionInvalidError, InviteRequiredError } from "@/lib/graphql/client";
import { clearLegacyLastOpenedResumePreference } from "@/lib/cv/preferences";
import { clearPrintCache } from "@/lib/cv/print";

let signingOut = false;

const USER_SCOPED_STORAGE_PREFIXES = [
  "cv:lastOpenedResumeId:",
  "cv:activeAssistantThreadId:",
] as const;

function isSessionRelatedError(error: unknown): boolean {
  if (error instanceof SessionInvalidError) {
    return true;
  }
  if (error instanceof InviteRequiredError) {
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
  clearPrintCache();
  clearAllWorkspaceCache();

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && USER_SCOPED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

async function signOutOnSessionExpired(callbackUrl = "/login"): Promise<void> {
  if (signingOut || typeof window === "undefined") {
    return;
  }

  signingOut = true;
  clearSessionCache();

  const { toast } = await import("sonner");
  if (callbackUrl === "/login?error=InviteRequired") {
    toast.error("This beta is invite only.");
  } else {
    toast.error("Session expired");
  }

  const { signOut } = await import("next-auth/react");
  void signOut({ callbackUrl });
}

/** Signs out when a request fails due to an invalid or expired session. */
export async function handleSessionInvalid(error: unknown): Promise<boolean> {
  if (error instanceof InviteRequiredError) {
    await signOutOnSessionExpired("/login?error=InviteRequired");
    return true;
  }
  if (!isSessionRelatedError(error)) {
    return false;
  }

  await signOutOnSessionExpired();
  return true;
}

/** Signs out after workspace bootstrap fails due to an invalid session. */
export async function handleWorkspaceLoadFailure(error?: unknown): Promise<boolean> {
  if (error instanceof InviteRequiredError) {
    await signOutOnSessionExpired("/login?error=InviteRequired");
    return true;
  }
  if (!isSessionRelatedError(error)) {
    return false;
  }
  await signOutOnSessionExpired();
  return true;
}
