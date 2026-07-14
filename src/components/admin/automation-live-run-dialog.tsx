"use client";

import { Check, Circle, Loader2, X } from "lucide-react";
import type { AutomationRunStep } from "@/lib/api/automation-run-stream";
import { cn } from "@/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

type AutomationLiveRunDialogProps = {
  open: boolean;
  automationName: string;
  steps: AutomationRunStep[];
  error?: string | null;
  onDismiss?: () => void;
};

function StepIcon({ status }: { status: AutomationRunStep["status"] }) {
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />;
  }
  if (status === "done") {
    return <Check className="size-3.5 text-emerald-600" aria-hidden />;
  }
  if (status === "error") {
    return <X className="size-3.5 text-destructive" aria-hidden />;
  }
  return <Circle className="size-3.5 text-muted-foreground" aria-hidden />;
}

export function AutomationLiveRunDialog({
  open,
  automationName,
  steps,
  error,
  onDismiss,
}: AutomationLiveRunDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss?.();
      }}
    >
      <ResponsiveDialogContent
        showCloseButton={Boolean(onDismiss)}
        className="sm:max-w-md"
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Running {automationName}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Live steps as the automation searches, filters, matches, and emails.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ol className="space-y-2 py-1" aria-live="polite">
          {steps.length === 0 ? (
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Starting…
            </li>
          ) : (
            steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border border-border/60 px-3 py-2 text-sm",
                  step.status === "running" && "border-primary/30 bg-primary/5",
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <StepIcon status={step.status} />
                </span>
                <span className="min-w-0 flex-1 leading-snug">{step.label}</span>
              </li>
            ))
          )}
        </ol>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

