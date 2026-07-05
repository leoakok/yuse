"use client";

import { useEffect, useRef, useState } from "react";

interface UseStaleWhileRevalidateOptions<T> {
  enabled?: boolean;
  getCached: () => T | null;
  setCached: (value: T) => void;
}

/**
 * Returns cached data immediately, then revalidates in the background.
 * `isLoading` is true only when there is no cached value yet.
 */
export function useStaleWhileRevalidate<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  { enabled = true, getCached, setCached }: UseStaleWhileRevalidateOptions<T>
): {
  data: T | null;
  isLoading: boolean;
  isRevalidating: boolean;
  setData: (value: T | ((current: T | null) => T | null)) => void;
} {
  const cachedOnMount = useRef(getCached());
  const [data, setDataState] = useState<T | null>(() => cachedOnMount.current);
  const [isLoading, setIsLoading] = useState(() => cachedOnMount.current == null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const setData = (value: T | ((current: T | null) => T | null)) => {
    setDataState((current) => {
      const next =
        typeof value === "function"
          ? (value as (current: T | null) => T | null)(current)
          : value;
      if (next != null) {
        setCached(next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const cached = getCached();
    if (cached != null) {
      setDataState(cached);
      setIsLoading(false);
    }

    setIsRevalidating(true);
    void fetcher()
      .then((fresh) => {
        if (cancelled) {
          return;
        }
        setCached(fresh);
        setDataState(fresh);
        setIsLoading(false);
        setIsRevalidating(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsRevalidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls invalidation via deps
  }, [enabled, ...deps]);

  return { data, isLoading, isRevalidating, setData };
}
