"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { User, Workspace } from "@/lib/types/user";
import { bootstrapWorkspace } from "@/lib/api/cv-api";
import {
  handleWorkspaceLoadFailure,
  isSigningOut,
} from "@/lib/auth/session-invalid";
import { getCachedBootstrap, setCachedBootstrap } from "@/lib/cache/workspace-cache";
import { clearLegacyLastOpenedResumePreference } from "@/lib/cv/preferences";

interface WorkspaceContextValue {
  user: User;
  workspace: Workspace | null;
  bootstrapping: boolean;
  updateUser: (patch: Partial<User>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BOOTSTRAP_MAX_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_MS = 400;

async function loadWorkspaceWithRetry() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt++) {
    try {
      return await bootstrapWorkspace();
    } catch (error) {
      lastError = error;
      if (attempt < BOOTSTRAP_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_RETRY_MS * attempt));
      }
    }
  }
  throw lastError;
}

function isBootstrapResultValid(result: { user: User; workspace: Workspace }): boolean {
  return Boolean(result.user?.id && result.workspace?.id);
}

function userFromSession(session: Session | null): User | null {
  const sessionUser = session?.user;
  if (!sessionUser?.id || !sessionUser.email) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.name?.trim() || sessionUser.email,
    avatarUrl: sessionUser.image ?? undefined,
    role: "USER",
    hasPasswordCredential: sessionUser.id.startsWith("email-"),
    hasGoogleCredential: Boolean(sessionUser.googleId) || sessionUser.id.startsWith("google-"),
    canChangeEmail: sessionUser.id.startsWith("email-"),
    emailVerified: !sessionUser.id.startsWith("email-"),
    createdAt: "",
    updatedAt: "",
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status, data: session, update } = useSession();
  const updateRef = useRef(update);
  updateRef.current = update;
  const bootstrappedRef = useRef(false);
  const fetchStartedRef = useRef(false);
  const clearBootstrapSentRef = useRef(false);

  const sessionUserId = session?.user?.id;
  const cachedBootstrap =
    sessionUserId && status === "authenticated"
      ? getCachedBootstrap(sessionUserId)
      : null;

  const [user, setUser] = useState<User | null>(
    () => cachedBootstrap?.user ?? userFromSession(session)
  );
  const [workspace, setWorkspace] = useState<Workspace | null>(
    () => cachedBootstrap?.workspace ?? null
  );
  const [bootstrapping, setBootstrapping] = useState(
    () => !cachedBootstrap || !isBootstrapResultValid(cachedBootstrap)
  );
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  useEffect(() => {
    clearLegacyLastOpenedResumePreference();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      bootstrappedRef.current = false;
      fetchStartedRef.current = false;
      clearBootstrapSentRef.current = false;
      setUser(null);
      setWorkspace(null);
      setBootstrapping(false);
      return;
    }

    if (status !== "authenticated" || isSigningOut() || !sessionUserId) {
      return;
    }

    if (fetchStartedRef.current) {
      return;
    }
    fetchStartedRef.current = true;

    let cancelled = false;
    setBootstrapError(null);

    const cached = getCachedBootstrap(sessionUserId);
    if (cached && isBootstrapResultValid(cached)) {
      setUser(cached.user);
      setWorkspace(cached.workspace);
      setBootstrapping(false);
    } else {
      setBootstrapping(true);
    }

    void loadWorkspaceWithRetry()
      .then(async (result) => {
        if (cancelled || isSigningOut()) {
          return;
        }

        if (!isBootstrapResultValid(result)) {
          const handled = await handleWorkspaceLoadFailure();
          if (!handled) {
            setBootstrapError("Could not load your workspace. Try again in a moment.");
            setBootstrapping(false);
          }
          return;
        }

        bootstrappedRef.current = true;
        setCachedBootstrap(sessionUserId, result);
        setUser(result.user);
        setWorkspace(result.workspace);
        setBootstrapping(false);

        if (session?.sessionBootstrap && !clearBootstrapSentRef.current) {
          clearBootstrapSentRef.current = true;
          await updateRef.current({ clearSessionBootstrap: true });
        }
      })
      .catch(async (error) => {
        if (cancelled || isSigningOut()) {
          return;
        }
        const handled = await handleWorkspaceLoadFailure(error);
        if (handled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Could not load your workspace. Try again in a moment.";
        setBootstrapError(message);
        setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, sessionUserId, session?.sessionBootstrap]);

  if (status === "loading") {
    return null;
  }

  if (bootstrapError) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p className="text-center text-destructive">{bootstrapError}</p>
        <p className="text-center">Run `npm run start` to launch Postgres and the backend.</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        workspace,
        bootstrapping,
        updateUser,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
