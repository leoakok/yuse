"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motionTransitionColors } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  className?: string;
  label?: string;
}

export function ResizeHandle({ onResize, className, label = "Resize panel" }: ResizeHandleProps) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragging.current = true;
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      let lastX = event.clientX;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragging.current) return;
        const delta = moveEvent.clientX - lastX;
        lastX = moveEvent.clientX;
        onResize(delta);
      };

      const endDrag = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", endDrag);
        target.removeEventListener("pointercancel", endDrag);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerup", endDrag);
      target.addEventListener("pointercancel", endDrag);
    },
    [onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative z-10 w-1 shrink-0 cursor-col-resize touch-none",
        "bg-border/60 hover:bg-primary/40 active:bg-primary/60",
        motionTransitionColors,
        className
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export function useStoredWidth(key: string, fallback: number) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) setWidth(parsed);
    }
  }, [key]);

  const setAndStore = useCallback(
    (next: number | ((prev: number) => number)) => {
      setWidth((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        localStorage.setItem(key, String(value));
        return value;
      });
    },
    [key]
  );

  return [width, setAndStore] as const;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const EDITOR_KEY = "cv-shell-editor-width";

export const EDITOR_DEFAULT = 400;
export const EDITOR_MIN = 300;
export const EDITOR_MAX = 560;

export const PREVIEW_KEY = "cv-shell-preview-width";

export const PREVIEW_DEFAULT = 384;
export const PREVIEW_MIN = 280;
export const PREVIEW_MAX = 720;

export const ASSISTANT_KEY = "cv-shell-assistant-width";

export const ASSISTANT_DEFAULT = 440;
export const ASSISTANT_MIN = 320;
export const ASSISTANT_MAX = 640;
