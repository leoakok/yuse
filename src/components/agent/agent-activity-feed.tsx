"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import type { AgentActivity } from "@/lib/types/assistant";
import { humanizeStatusLabel, isThinkingStatusLabel } from "@/lib/assistant/status-labels";
import { DotmSquare4 } from "@/components/ui/dotm-square-4";
import { motionEnterFadeUp, motionTransitionTransform } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

function ThinkingIndicator() {
  return (
    <DotmSquare4
      size={22}
      dotSize={3}
      speed={1.2}
      color="var(--primary)"
      bloom
      ariaLabel="Thinking"
      className="shrink-0"
    />
  );
}

const COMPLETED_HOLD_MS = 1400;
const FADE_OUT_MS = 280;

function ActivityIcon({ status }: { status: AgentActivity["status"] }) {
  if (status === "complete") {
    return <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === "error") {
    return <X className="size-3.5 text-destructive" />;
  }
  return <LoaderCircle className="size-3.5 animate-spin text-primary" />;
}

export function isThinkingLabel(label: string | undefined): boolean {
  return isThinkingStatusLabel(label);
}

type SlotPhase = "enter" | "visible" | "exit";

interface ActivitySlot {
  id: string;
  activity: AgentActivity;
  phase: SlotPhase;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scheduleFadeOut(
  activityId: string,
  timersRef: { current: ReturnType<typeof setTimeout>[] },
  scheduledRef: { current: Set<string> },
  setSlots: Dispatch<SetStateAction<ActivitySlot[]>>
) {
  if (scheduledRef.current.has(activityId)) return;
  scheduledRef.current.add(activityId);

  const holdMs = prefersReducedMotion() ? 250 : COMPLETED_HOLD_MS;
  const fadeMs = prefersReducedMotion() ? 0 : FADE_OUT_MS;

  const holdTimer = setTimeout(() => {
    setSlots((current) =>
      current.map((slot) =>
        slot.id === activityId ? { ...slot, phase: "exit" } : slot
      )
    );

    const removeTimer = setTimeout(() => {
      setSlots((current) => current.filter((slot) => slot.id !== activityId));
      scheduledRef.current.delete(activityId);
    }, fadeMs);

    timersRef.current.push(removeTimer);
  }, holdMs);

  timersRef.current.push(holdTimer);
}

/**
 * Keeps errors visible, shows the current step prominently, and fades out
 * completed steps one at a time instead of stacking the full history.
 */
function useStepwiseActivitySlots(activities: AgentActivity[]): ActivitySlot[] {
  const [slots, setSlots] = useState<ActivitySlot[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduledRef = useRef<Set<string>>(new Set());
  const prevActivitiesRef = useRef<AgentActivity[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (activities.length === 0) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      scheduledRef.current.clear();
      prevActivitiesRef.current = [];
      setSlots([]);
      return;
    }

    const prevById = new Map(prevActivitiesRef.current.map((activity) => [activity.id, activity]));
    prevActivitiesRef.current = activities;

    const errors = activities.filter((activity) => activity.status === "error");
    const active = [...activities].reverse().find((activity) => activity.status === "active");
    const completes = activities.filter((activity) => activity.status === "complete");
    const latestComplete = completes.at(-1);

    setSlots((prev) => {
      const prevPhases = new Map(prev.map((slot) => [slot.id, slot.phase]));
      const next: ActivitySlot[] = [];

      for (const error of errors) {
        next.push({
          id: error.id,
          activity: error,
          phase: prevPhases.get(error.id) ?? "visible",
        });
      }

      if (latestComplete) {
        const wasActive = prevById.get(latestComplete.id)?.status === "active";
        const alreadyVisible = prev.some((slot) => slot.id === latestComplete.id);
        next.push({
          id: latestComplete.id,
          activity: latestComplete,
          phase: alreadyVisible
            ? wasActive
              ? "visible"
              : (prevPhases.get(latestComplete.id) ?? "visible")
            : "enter",
        });
      }

      if (active && active.id !== latestComplete?.id) {
        const alreadyVisible = prev.some((slot) => slot.id === active.id);
        next.push({
          id: active.id,
          activity: active,
          phase: alreadyVisible ? "visible" : "enter",
        });
      }

      return next;
    });

    if (latestComplete) {
      scheduleFadeOut(latestComplete.id, timersRef, scheduledRef, setSlots);
    }
  }, [activities]);

  return slots;
}

interface ActivityStepRowProps {
  slot: ActivitySlot;
}

function ActivityStepRow({ slot }: ActivityStepRowProps) {
  const { activity, phase } = slot;

  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-xs motion-safe:transition-opacity motion-safe:duration-default motion-safe:ease-motion-out motion-reduce:transition-none",
        phase === "enter" && motionEnterFadeUp,
        phase === "exit" &&
          "pointer-events-none motion-safe:animate-out motion-safe:fade-out motion-safe:duration-default motion-reduce:opacity-0",
        phase === "visible" && "opacity-100",
        activity.status === "active" && "font-medium text-foreground",
        activity.status === "complete" && "text-muted-foreground",
        activity.status === "error" && "text-destructive"
      )}
      aria-hidden={phase === "exit" ? true : undefined}
    >
      <span className="mt-0.5 shrink-0">
        <ActivityIcon status={activity.status} />
      </span>
      <span>{activity.label}</span>
    </li>
  );
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  className?: string;
}

/** Step-by-step tool progress during streaming, one current action at a time. */
export function AgentActivityFeed({ activities, className }: AgentActivityFeedProps) {
  const slots = useStepwiseActivitySlots(activities);

  if (slots.length === 0) {
    return null;
  }

  const hasErrors = slots.some((slot) => slot.activity.status === "error");
  const stepSlots = slots.filter((slot) => slot.activity.status !== "error");
  const errorSlots = slots.filter((slot) => slot.activity.status === "error");

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 px-3 py-2.5 backdrop-blur-sm",
        className
      )}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {hasErrors ? (
        <ol className="space-y-1.5">
          {errorSlots.map((slot) => (
            <ActivityStepRow key={slot.id} slot={slot} />
          ))}
        </ol>
      ) : null}
      {stepSlots.length > 0 ? (
        <ol
          className={cn(hasErrors && "mt-2 border-t border-border/60 pt-2", "space-y-1.5")}
        >
          {stepSlots.map((slot) => (
            <ActivityStepRow key={slot.id} slot={slot} />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

interface ThinkingCollapsibleProps {
  label?: string;
  content?: string;
  isActive?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

/** Status row or collapsible block for model reasoning / thinking phase. */
export function ThinkingCollapsible({
  label = "Give me a moment…",
  content,
  isActive = false,
  defaultOpen = false,
  className,
}: ThinkingCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = Boolean(content?.trim());

  const labelText = (
    <span
      className={cn(
        isActive ? "font-medium text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );

  if (!hasContent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "rounded-lg border bg-muted/40 px-3 py-2 backdrop-blur-sm",
          className
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          {isActive ? <ThinkingIndicator /> : null}
          {labelText}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 backdrop-blur-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground",
            motionTransitionTransform,
            open && "rotate-180"
          )}
        />
        {isActive ? <ThinkingIndicator /> : null}
        {labelText}
      </button>
      {open ? (
        <div className="whitespace-pre-wrap border-t px-3 py-2 text-xs text-muted-foreground">
          {content}
        </div>
      ) : null}
    </div>
  );
}

interface LiveStatusLineProps {
  label: string;
  className?: string;
}

/** Inline status for non-thinking, non-tool phases (e.g. saving). */
export function LiveStatusLine({ label, className }: LiveStatusLineProps) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm",
        className
      )}
    >
      <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
      <span>{humanizeStatusLabel(label) ?? label}</span>
    </p>
  );
}
