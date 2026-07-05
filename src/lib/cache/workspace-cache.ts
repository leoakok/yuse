import type { Resume, ResumeWithContent } from "@/lib/types/cv";
import type { TrackedJob } from "@/lib/types/job";
import type { Portfolio, PortfolioWithContent } from "@/lib/types/portfolio";
import type { User, Workspace } from "@/lib/types/user";

const STORAGE_PREFIX = "yuse:cache:";

const memory = new Map<string, unknown>();

type BootstrapCache = { user: User; workspace: Workspace };

function storageKey(userId: string, resource: string): string {
  return `${STORAGE_PREFIX}${userId}:${resource}`;
}

function read<T>(key: string): T | null {
  if (memory.has(key)) {
    return memory.get(key) as T;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as T;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  memory.set(key, value);
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage quota or private mode
  }
}

function removeKey(key: string): void {
  memory.delete(key);
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(key);
}

export function clearWorkspaceCacheForUser(userId: string): void {
  const prefix = `${STORAGE_PREFIX}${userId}:`;
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) {
      memory.delete(key);
    }
  }
  if (typeof window === "undefined") {
    return;
  }
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function clearAllWorkspaceCache(): void {
  memory.clear();
  if (typeof window === "undefined") {
    return;
  }
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function getCachedBootstrap(userId: string): BootstrapCache | null {
  return read<BootstrapCache>(storageKey(userId, "bootstrap"));
}

export function setCachedBootstrap(userId: string, data: BootstrapCache): void {
  write(storageKey(userId, "bootstrap"), data);
}

export function getCachedResumes(userId: string): Resume[] | null {
  return read<Resume[]>(storageKey(userId, "resumes"));
}

export function setCachedResumes(userId: string, resumes: Resume[]): void {
  write(storageKey(userId, "resumes"), resumes);
}

export function getCachedPortfolios(userId: string): Portfolio[] | null {
  return read<Portfolio[]>(storageKey(userId, "portfolios"));
}

export function setCachedPortfolios(userId: string, portfolios: Portfolio[]): void {
  write(storageKey(userId, "portfolios"), portfolios);
}

export function getCachedJobs(userId: string): TrackedJob[] | null {
  return read<TrackedJob[]>(storageKey(userId, "jobs"));
}

export function setCachedJobs(userId: string, jobs: TrackedJob[]): void {
  write(storageKey(userId, "jobs"), jobs);
}

export function getCachedResumeContent(
  userId: string,
  resumeId: string
): ResumeWithContent | null {
  return read<ResumeWithContent>(storageKey(userId, `resume:${resumeId}`));
}

export function setCachedResumeContent(
  userId: string,
  resumeId: string,
  content: ResumeWithContent
): void {
  write(storageKey(userId, `resume:${resumeId}`), content);
}

export function removeCachedResumeContent(userId: string, resumeId: string): void {
  removeKey(storageKey(userId, `resume:${resumeId}`));
}

export function getCachedPortfolioContent(
  userId: string,
  portfolioId: string
): PortfolioWithContent | null {
  return read<PortfolioWithContent>(storageKey(userId, `portfolio:${portfolioId}`));
}

export function setCachedPortfolioContent(
  userId: string,
  portfolioId: string,
  content: PortfolioWithContent
): void {
  write(storageKey(userId, `portfolio:${portfolioId}`), content);
}

export function removeCachedPortfolioContent(userId: string, portfolioId: string): void {
  removeKey(storageKey(userId, `portfolio:${portfolioId}`));
}
