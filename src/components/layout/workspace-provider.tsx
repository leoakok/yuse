"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { User, Workspace } from "@/lib/types/user";
import { bootstrapWorkspace } from "@/lib/api/cv-api";
import {
  handleWorkspaceLoadFailure,
  isSigningOut,
} from "@/lib/auth/session-invalid";
import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { clearLegacyLastOpenedResumePreference } from "@/lib/cv/preferences";

interface WorkspaceContextValue {
  user: User;
  workspace: Workspace;
  loading: boolean;
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status, data: session, update } = useSession();
  const updateRef = useRef(update);
  updateRef.current = update;
  const bootstrappedRef = useRef(false);
  const clearBootstrapSentRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    clearLegacyLastOpenedResumePreference();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      bootstrappedRef.current = false;
      clearBootstrapSentRef.current = false;
      return;
    }

    if (status !== "authenticated" || isSigningOut() || bootstrappedRef.current) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setBootstrapError(null);

    void loadWorkspaceWithRetry()
      .then(async (result) => {
        if (cancelled || isSigningOut()) {
          return;
        }

        if (!isBootstrapResultValid(result)) {
          const handled = await handleWorkspaceLoadFailure();
          if (!handled) {
            setBootstrapError("Could not load your workspace. Try again in a moment.");
            setLoading(false);
          }
          return;
        }

        bootstrappedRef.current = true;
        setUser(result.user);
        setWorkspace(result.workspace);
        setLoading(false);

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
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, session?.sessionBootstrap]);

  if (status === "loading" || loading || !user || !workspace) {
    if (bootstrapError) {
      return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <p className="text-center text-destructive">{bootstrapError}</p>
          <p className="text-center">Run `npm run start` to launch Postgres and the backend.</p>
        </div>
      );
    }

    return <AppShellSkeleton />;
  }

  return (
    <WorkspaceContext.Provider value={{ user, workspace, loading }}>
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
