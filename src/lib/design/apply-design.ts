import { applyDesignShare, createDesignShare, getDesignShareForResume } from "@/lib/api/design-share-api";
import type { DesignShareContentMode } from "@/lib/types/design-share";

const STORAGE_KEY = "yuse:pending-design-share";

export type PendingDesignShare = {
  designShareId: string;
  title?: string | null;
};

export function stashPendingDesignShare(design: PendingDesignShare): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function takePendingDesignShare(): PendingDesignShare | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PendingDesignShare;
  } catch {
    return null;
  }
}

export { createDesignShare, getDesignShareForResume, applyDesignShare };
export type { DesignShareContentMode };
