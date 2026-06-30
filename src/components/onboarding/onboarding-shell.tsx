"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingShellProps {
  stepIndex: number;
  stepCount: number;
  onSkip: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function OnboardingShell({
  stepIndex,
  stepCount,
  onSkip,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-end px-4 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
          Skip for now
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-8 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="shrink-0 space-y-6 px-4 pb-10 sm:px-6">
        {footer}
        <div
          className="flex justify-center gap-1.5"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-label={`Step ${stepIndex + 1} of ${stepCount}`}
        >
          {Array.from({ length: stepCount }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25"
              )}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
