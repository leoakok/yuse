"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Sparkles, Upload } from "lucide-react";
import { GitHubMark } from "@/components/brand/github-mark";
import { toast } from "sonner";
import { OnboardingImportFile, OnboardingImportLinkedIn } from "@/components/onboarding/onboarding-import";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { YusePresence } from "@/components/onboarding/yuse-presence";
import { useWorkspace } from "@/components/layout/workspace-provider";
import {
  ONBOARDING_GOALS,
  ONBOARDING_START_OPTIONS,
  type OnboardingStartPath,
} from "@/lib/onboarding/content";
import {
  completeOnboarding,
  type OnboardingGoal,
} from "@/lib/onboarding/state";
import { resolveHomePath } from "@/lib/cv/home-path";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FlowStep = "welcome" | "why" | "start" | "start-detail" | "invite";

function stepIndex(step: FlowStep): number {
  if (step === "welcome") return 0;
  if (step === "why") return 1;
  if (step === "start" || step === "start-detail") return 2;
  return 3;
}

const TOTAL_STEPS = 4;

interface OnboardingFlowProps {
  displayName: string;
}

export function OnboardingFlow({ displayName }: OnboardingFlowProps) {
  const router = useRouter();
  const { user } = useWorkspace();
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  const [step, setStep] = useState<FlowStep>("welcome");
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [startPath, setStartPath] = useState<OnboardingStartPath | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const finish = useCallback(
    async (selectedGoal?: OnboardingGoal) => {
      completeOnboarding(user.id, selectedGoal ?? goal ?? undefined);
      const path = await resolveHomePath(user.id);
      router.replace(path);
    },
    [goal, router, user.id]
  );

  const skip = useCallback(() => {
    void finish();
  }, [finish]);

  const goInvite = useCallback(() => {
    setStep("invite");
  }, []);

  const handleStartPath = (path: OnboardingStartPath) => {
    setStartPath(path);
    if (path === "GITHUB") {
      completeOnboarding(user.id, goal ?? undefined);
      window.location.href = "/api/auth/github/start";
      return;
    }
    if (path === "EXPLORE") {
      goInvite();
      return;
    }
    setStep("start-detail");
  };

  const handleCopyInvite = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      toast.success("Link copied. Send it to a friend.");
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const footer = useMemo(() => {
    if (step === "start-detail") return null;

    if (step === "welcome") {
      return (
        <Button type="button" size="lg" className="w-full" onClick={() => setStep("why")}>
          Continue
        </Button>
      );
    }

    if (step === "why") {
      return (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!goal}
          onClick={() => setStep("start")}
        >
          Continue
        </Button>
      );
    }

    if (step === "start") {
      return (
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={goInvite}>
          Decide later
        </Button>
      );
    }

    if (step === "invite") {
      return (
        <Button type="button" size="lg" className="w-full" onClick={() => void finish()}>
          Start working together
        </Button>
      );
    }

    return null;
  }, [finish, goInvite, goal, step]);

  const currentStepIndex = step === "start-detail" ? stepIndex("start") : stepIndex(step);

  return (
    <OnboardingShell
      stepIndex={currentStepIndex}
      stepCount={TOTAL_STEPS}
      onSkip={skip}
      footer={footer}
    >
      {step === "welcome" ? (
        <YusePresence
          message={`Hi ${firstName}, I'm Yuse.`}
          detail="I'm your career partner. I help you shape CVs, track applications, and show your work, so you can focus on the conversations that matter."
        />
      ) : null}

      {step === "why" ? (
        <div className="space-y-8">
          <YusePresence
            message="What brings you here?"
            detail="This helps me understand how we should work together. Pick what feels closest. You can change direction anytime."
          />
          <ul className="space-y-2" role="listbox" aria-label="Your goal">
            {ONBOARDING_GOALS.map((option) => {
              const selected = goal === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setGoal(option.id)}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step === "start" ? (
        <div className="space-y-6">
          <YusePresence
            message="How would you like to begin?"
            detail="Pick a fast path, or look around. I'll still be here when you're ready."
          />
          <ul className="space-y-2">
            {ONBOARDING_START_OPTIONS.map((option) => {
              const Icon =
                option.id === "IMPORT_FILE"
                  ? Upload
                  : option.id === "LINKEDIN"
                    ? Link2
                    : option.id === "EXPLORE"
                      ? Sparkles
                      : null;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className="flex w-full gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => handleStartPath(option.id)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {option.id === "GITHUB" ? (
                        <GitHubMark className="size-4" />
                      ) : Icon ? (
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step === "start-detail" && startPath === "IMPORT_FILE" ? (
        <div className="space-y-6">
          <YusePresence
            message="Drop your CV and I'll take it from here."
            detail="I'll read your file and set up a resume you can tailor with me."
          />
          <OnboardingImportFile onSuccess={goInvite} />
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setStep("start")}>
            Back
          </Button>
        </div>
      ) : null}

      {step === "start-detail" && startPath === "LINKEDIN" ? (
        <div className="space-y-6">
          <YusePresence
            message="Share your LinkedIn profile."
            detail="I'll import the essentials into a CV we can refine together."
          />
          <OnboardingImportLinkedIn onSuccess={goInvite} />
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setStep("start")}>
            Back
          </Button>
        </div>
      ) : null}

      {step === "invite" ? (
        <div className="space-y-8">
          <YusePresence
            message="Know someone else on the hunt?"
            detail="Good people know good people. Send them my way. I'd love to work with them too."
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleCopyInvite()}
          >
            {inviteCopied ? <Check /> : <Copy />}
            {inviteCopied ? "Copied" : "Copy invite link"}
          </Button>
        </div>
      ) : null}
    </OnboardingShell>
  );
}
