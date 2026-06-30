"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscreteSliderProps<T extends string | number> {
  steps: { value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Gap indices (between snap points) that get a visible tick mark. */
function visibleTickGaps(gapCount: number): number[] {
  if (gapCount <= 0) return [];
  const maxTicks = 8;
  if (gapCount <= maxTicks) {
    return Array.from({ length: gapCount }, (_, j) => j);
  }
  const stride = Math.ceil(gapCount / maxTicks);
  const gaps: number[] = [];
  for (let j = 0; j < gapCount; j += stride) {
    gaps.push(j);
  }
  if (gaps[gaps.length - 1] !== gapCount - 1) {
    gaps.push(gapCount - 1);
  }
  return gaps;
}

export function DiscreteSlider<T extends string | number>({
  steps,
  value,
  onChange,
  className,
}: DiscreteSliderProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const index = steps.findIndex((step) => step.value === value);
  const currentIndex = index >= 0 ? index : 0;
  const maxIndex = Math.max(0, steps.length - 1);
  const gapCount = maxIndex;

  const setIndex = useCallback(
    (nextIndex: number) => {
      const step = steps[Math.max(0, Math.min(maxIndex, nextIndex))];
      if (step) onChange(step.value);
    },
    [maxIndex, onChange, steps]
  );

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const inner = innerRef.current;
      if (!inner || maxIndex === 0) return 0;
      const rect = inner.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * maxIndex);
    },
    [maxIndex]
  );

  // Snap points sit on the padded inner rail; ticks fall halfway between them.
  const snapLeftPercent = (stepIndex: number) =>
    maxIndex === 0 ? 50 : (stepIndex / maxIndex) * 100;

  const tickLeftPercent = (gapIndex: number) =>
    maxIndex === 0 ? 50 : ((gapIndex + 0.5) / maxIndex) * 100;

  // Match vertical thumb inset ( (32px track − 16px thumb) / 2 = 8px ) on both axes:
  // rail inset = gap (8px) + thumb radius (8px) = 16px (inset-x-4).
  const THUMB_INSET_CLASS = "inset-x-4";

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIndex(indexFromClientX(event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setIndex(indexFromClientX(event.clientX));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const tickGaps = visibleTickGaps(gapCount);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-valuenow={currentIndex}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            setIndex(currentIndex - 1);
          }
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            setIndex(currentIndex + 1);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-8 min-w-0 flex-1 cursor-pointer touch-none select-none rounded-lg bg-muted"
      >
        <div
          ref={innerRef}
          data-slider-inner
          className={cn("absolute inset-y-0", THUMB_INSET_CLASS)}
        >
          {tickGaps.map((gapIndex) => (
            <span
              key={gapIndex}
              className="pointer-events-none absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-border/70"
              style={{ left: `${tickLeftPercent(gapIndex)}%` }}
              aria-hidden
            />
          ))}
          <div
            className="pointer-events-none absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[5px] bg-primary shadow-sm"
            style={{ left: `${snapLeftPercent(currentIndex)}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setIndex(currentIndex - 1)}
          disabled={currentIndex <= 0}
          className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Decrease"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIndex(currentIndex + 1)}
          disabled={currentIndex >= maxIndex}
          className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Increase"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
