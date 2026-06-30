"use client";

import { useCallback, useMemo, useRef, type PointerEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSliderGeometry,
  indexToLeftStyle,
  pointerRatioFromTrackRect,
  ratioToIndex,
  tickRatioToLeftStyle,
  visibleTickGaps,
  type DiscreteSliderLayout,
} from "@/lib/cv/discrete-slider-geometry";

export type { DiscreteSliderLayout };

interface DiscreteSliderProps<T extends string | number> {
  steps: { value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Segmented: zone-centered snaps with (n−1)/2 tick lines. Linear: evenly spaced snaps, sparse ticks. */
  layout?: DiscreteSliderLayout;
  className?: string;
}

export function DiscreteSlider<T extends string | number>({
  steps,
  value,
  onChange,
  layout = "linear",
  className,
}: DiscreteSliderProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const stepCount = steps.length;
  const geometry = useMemo(
    () => buildSliderGeometry({ layout, stepCount }),
    [layout, stepCount]
  );
  const { maxIndex, snapRatios, isSegmented } = geometry;

  const index = steps.findIndex((step) => step.value === value);
  const currentIndex = index >= 0 ? index : 0;

  const setIndex = useCallback(
    (nextIndex: number) => {
      const step = steps[Math.max(0, Math.min(maxIndex, nextIndex))];
      if (step) onChange(step.value);
    },
    [maxIndex, onChange, steps]
  );

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || maxIndex === 0) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = pointerRatioFromTrackRect(clientX, rect, geometry);
      return ratioToIndex(ratio, snapRatios);
    },
    [geometry, maxIndex, snapRatios]
  );

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

  const tickPositions = isSegmented
    ? geometry.tickRatios.map((ratio, j) => ({ key: j, ratio }))
    : visibleTickGaps(maxIndex).map((gapIndex) => ({
        key: gapIndex,
        ratio: geometry.tickRatios[gapIndex] ?? 0.5,
      }));

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
        className={cn(
          "relative h-8 min-w-0 flex-1 cursor-pointer touch-none select-none rounded-lg bg-muted",
          !isSegmented && "px-4"
        )}
      >
        {tickPositions.map(({ key, ratio }) => (
          <span
            key={key}
            className="pointer-events-none absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-border/70"
            style={{ left: tickRatioToLeftStyle(ratio, geometry) }}
            aria-hidden
          />
        ))}
        <div
          className="pointer-events-none absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[5px] bg-primary shadow-sm"
          style={{ left: indexToLeftStyle(currentIndex, geometry) }}
        />
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
