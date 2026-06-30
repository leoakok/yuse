"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitHubMark, LinkedInMark } from "@/components/landing/brand-icons";
import {
  TAILOR_DEMO_EXAMPLES,
  type TailorDemoExample,
  type TailorDemoSource,
} from "@/lib/landing/tailor-demo-content";
import { cn } from "@/lib/utils";

const EXAMPLES = TAILOR_DEMO_EXAMPLES;

const BUILD_STEPS = [
  "Reading the role",
  "Matching your GitHub projects",
  "Bringing in your LinkedIn",
  "Drafting from your Digital Twin",
  "Tailoring every line",
] as const;

type Phase = "idle" | "building" | "done";

const SOURCE_META: Record<TailorDemoSource, { label: string; icon: React.ReactNode }> = {
  github: { label: "GitHub", icon: <GitHubMark className="size-3" /> },
  linkedin: { label: "LinkedIn", icon: <LinkedInMark className="size-3" /> },
  twin: { label: "Digital Twin", icon: <Sparkles className="size-3" /> },
};

export function TailorDemo() {
  const [activeExample, setActiveExample] = useState<TailorDemoExample>(EXAMPLES[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function runTailoring(example: TailorDemoExample) {
    clearTimers();
    setActiveExample(example);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setStepIndex(BUILD_STEPS.length - 1);
      setPhase("done");
      return;
    }

    setPhase("building");
    setStepIndex(0);

    const stepDuration = 480;
    BUILD_STEPS.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setStepIndex(i), i * stepDuration),
      );
    });
    timers.current.push(
      setTimeout(
        () => setPhase("done"),
        BUILD_STEPS.length * stepDuration,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* Left: the job link input */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Try it
            </span>
            <p className="text-lg font-medium tracking-tight">
              Paste a job link. I&apos;ll do the rest.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={activeExample.url}
              aria-label="Job posting link"
              className="h-9 font-mono text-xs sm:text-sm"
            />
            <Button
              size="lg"
              onClick={() => runTailoring(activeExample)}
              disabled={phase === "building"}
              className="shrink-0"
            >
              {phase === "building" ? "Tailoring…" : "Tailor my CV"}
              {phase !== "building" ? <ArrowRight /> : null}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              Or pick an example role:
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => runTailoring(example)}
                  aria-pressed={activeExample.id === example.id}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeExample.id === example.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-auto flex flex-col gap-2 pt-2" aria-live="polite">
            {BUILD_STEPS.map((step, i) => {
              const reached = phase !== "idle" && i <= stepIndex;
              const complete = phase === "done" || i < stepIndex;
              return (
                <li
                  key={step}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-all duration-300",
                    reached
                      ? "text-foreground opacity-100"
                      : "text-muted-foreground opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                      complete
                        ? "border-primary bg-primary text-primary-foreground"
                        : reached
                          ? "border-primary text-primary"
                          : "border-border",
                    )}
                  >
                    {complete ? <Check className="size-2.5" /> : null}
                  </span>
                  {step}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: the tailored CV preview */}
        <div className="relative min-h-80 overflow-hidden rounded-lg bg-muted/35 p-4 sm:p-5">
          {phase === "idle" ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-2 text-center">
              <Sparkles className="size-6 text-primary" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Your tailored CV appears here — pulled from your real work, shaped
                for this exact role.
              </p>
            </div>
          ) : (
            <div
              key={activeExample.id + phase}
              className={cn(
                "flex flex-col gap-5",
                phase === "done"
                  ? "animate-in fade-in slide-in-from-bottom-2 duration-500"
                  : "opacity-60",
              )}
            >
              <header className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-primary">
                  Tailored for {activeExample.company}
                </span>
                <h3 className="text-xl font-semibold tracking-tight">
                  {activeExample.headline}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {activeExample.summary}
                </p>
              </header>

              <div className="flex flex-wrap gap-1.5">
                {activeExample.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>

              <ul className="flex flex-col gap-4">
                {activeExample.bullets.map((bullet, i) => (
                  <li
                    key={bullet.text}
                    className={cn(
                      "flex flex-col gap-1 border-l-2 border-primary/60 pl-3 text-sm",
                      phase === "done" &&
                        "animate-in fade-in slide-in-from-bottom-1",
                    )}
                    style={
                      phase === "done"
                        ? { animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }
                        : undefined
                    }
                  >
                    <span className="leading-snug">{bullet.text}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {SOURCE_META[bullet.source].icon}
                      from your {SOURCE_META[bullet.source].label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
