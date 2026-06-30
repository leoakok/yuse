import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseDebouncedAutoSaveOptions {
  /** When false, no saves are scheduled (e.g. read-only). */
  enabled?: boolean;
  /** Debounce delay after the last change before calling the API. */
  delayMs?: number;
  isDirty: boolean;
  /** Serialized snapshot of editable fields, any change resets the debounce timer. */
  debounceKey: string;
  save: () => Promise<void>;
}

/**
 * Debounced persist: local edits apply immediately via parent state; the API is
 * called only after the user pauses. Flushes once on unmount if still dirty.
 */
export function useDebouncedAutoSave({
  enabled = true,
  delayMs = 800,
  isDirty,
  debounceKey,
  save,
}: UseDebouncedAutoSaveOptions): { status: AutoSaveStatus } {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const saveRef = useRef(save);
  const isDirtyRef = useRef(isDirty);
  const enabledRef = useRef(enabled);

  saveRef.current = save;
  isDirtyRef.current = isDirty;
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !isDirty) {
      return;
    }

    setStatus("pending");
    const timer = window.setTimeout(() => {
      void (async () => {
        setStatus("saving");
        try {
          await saveRef.current();
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      })();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [enabled, isDirty, debounceKey, delayMs]);

  useEffect(() => {
    return () => {
      if (enabledRef.current && isDirtyRef.current) {
        void saveRef.current();
      }
    };
  }, []);

  return { status };
}
