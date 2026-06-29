"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitHubMark, LinkedInMark } from "@/components/landing/brand-icons";
import { cn } from "@/lib/utils";

type Source = "github" | "linkedin" | "twin";

type TailoredBullet = {
  text: string;
  source: Source;
};

type Role = {
  id: string;
  label: string;
  url: string;
  company: string;
  headline: string;
  summary: string;
  skills: string[];
  bullets: TailoredBullet[];
};

const ROLES: Role[] = [
  {
    id: "frontend",
    label: "Senior Frontend Engineer",
    url: "linear.app/careers/senior-frontend-engineer",
    company: "Linear",
    headline: "Senior Frontend Engineer",
    summary:
      "Product-minded frontend engineer who turns design systems into fast, accessible interfaces people love to use.",
    skills: ["React", "TypeScript", "Design systems", "Accessibility", "Web performance"],
    bullets: [
      { text: "Built a component library adopted across 7 product teams, cutting UI build time in half.", source: "github" },
      { text: "Led the accessibility pass that took the app to WCAG AA across every core flow.", source: "twin" },
      { text: "Shipped a rendering refactor that dropped largest-contentful-paint from 3.1s to 0.9s.", source: "github" },
    ],
  },
  {
    id: "ml",
    label: "Machine Learning Engineer",
    url: "openai.com/careers/machine-learning-engineer",
    company: "a research lab",
    headline: "Machine Learning Engineer",
    summary:
      "ML engineer who ships models to production and cares as much about evaluation as accuracy.",
    skills: ["Python", "PyTorch", "Evaluation", "Data pipelines", "MLOps"],
    bullets: [
      { text: "Trained and deployed a ranking model that lifted conversion 12% in an A/B test.", source: "github" },
      { text: "Built the offline evaluation harness the whole team now trusts before every release.", source: "twin" },
      { text: "Owned the feature pipeline processing 40M events a day with sub-minute freshness.", source: "linkedin" },
    ],
  },
  {
    id: "founding",
    label: "Founding Engineer",
    url: "yc.com/jobs/founding-engineer-seed-startup",
    company: "an early-stage startup",
    headline: "Founding Engineer",
    summary:
      "Generalist who goes from blank repo to shipped product, comfortable owning the whole stack and the customer.",
    skills: ["Full-stack", "Product sense", "Postgres", "Shipping fast", "Customer discovery"],
    bullets: [
      { text: "Took the first version of the product from idea to paying customers in 9 weeks, solo.", source: "twin" },
      { text: "Designed and ran the backend and infra that served the first 10k users.", source: "github" },
      { text: "Ran 30+ customer interviews and turned them directly into the roadmap.", source: "linkedin" },
    ],
  },
];

const BUILD_STEPS = [
  "Reading the role",
  "Matching your GitHub projects",
  "Bringing in your LinkedIn",
  "Drafting from your Digital Twin",
  "Tailoring every line",
] as const;

type Phase = "idle" | "building" | "done";

const SOURCE_META: Record<Source, { label: string; icon: React.ReactNode }> = {
  github: { label: "GitHub", icon: <GitHubMark className="size-3" /> },
  linkedin: { label: "LinkedIn", icon: <LinkedInMark className="size-3" /> },
  twin: { label: "Digital Twin", icon: <Sparkles className="size-3" /> },
};

export function TailorDemo() {
  const [activeRole, setActiveRole] = useState<Role>(ROLES[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function runTailoring(role: Role) {
    clearTimers();
    setActiveRole(role);

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
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
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
              value={activeRole.url}
              aria-label="Job posting link"
              className="h-9 font-mono text-xs sm:text-sm"
            />
            <Button
              size="lg"
              onClick={() => runTailoring(activeRole)}
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
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => runTailoring(role)}
                  aria-pressed={activeRole.id === role.id}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeRole.id === role.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {role.label}
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
        <div className="relative min-h-80 overflow-hidden rounded-xl border border-border bg-background p-5 sm:p-6">
          {phase === "idle" ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="size-6 text-primary" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Your tailored CV appears here — pulled from your real work, shaped
                for this exact role.
              </p>
            </div>
          ) : (
            <div
              key={activeRole.id + phase}
              className={cn(
                "flex flex-col gap-4",
                phase === "done"
                  ? "animate-in fade-in slide-in-from-bottom-2 duration-500"
                  : "opacity-60",
              )}
            >
              <header className="flex flex-col gap-1 border-b border-border pb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-primary">
                  Tailored for {activeRole.company}
                </span>
                <h3 className="text-xl font-semibold tracking-tight">
                  {activeRole.headline}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeRole.summary}
                </p>
              </header>

              <div className="flex flex-wrap gap-1.5">
                {activeRole.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>

              <ul className="flex flex-col gap-2.5">
                {activeRole.bullets.map((bullet, i) => (
                  <li
                    key={bullet.text}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border border-border/60 bg-card p-3 text-sm",
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
