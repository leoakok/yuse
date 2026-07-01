"use client";

import { useCallback, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createTrackedJob, updateTrackedJob } from "@/lib/api/cv-api";
import type { TrackedJob } from "@/lib/types/job";

type TrackStep = "url" | "manual";

interface JobTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTracked: (job: TrackedJob) => void;
}

async function createManualTrackedJob(
  title: string,
  company: string,
  description: string
): Promise<TrackedJob> {
  const job = await createTrackedJob(`manual://${crypto.randomUUID()}`);
  const trimmedDescription = description.trim();
  return updateTrackedJob({
    id: job.id,
    title: title.trim(),
    company: company.trim(),
    ...(trimmedDescription ? { metadata: { description: trimmedDescription } } : {}),
  });
}

export function JobTrackDialog({ open, onOpenChange, onTracked }: JobTrackDialogProps) {
  const { startNewChat, sendMessage, setOpen: setAssistantOpen } = useCvAssistant();
  const [step, setStep] = useState<TrackStep>("url");
  const [jobUrl, setJobUrl] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setStep("url");
    setJobUrl("");
    setTitle("");
    setCompany("");
    setDescription("");
    setError(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      resetState();
    }
    onOpenChange(next);
  };

  const startAssistantFlow = async (job: TrackedJob, message: string) => {
    const thread = await startNewChat();
    setAssistantOpen(true);
    resetState();
    onOpenChange(false);
    await sendMessage(message, [], {
      threadId: thread.id,
      contextOverride: { view: "job_tracker", jobId: job.id },
    });
    toast.success("Yuse is preparing your application.");
  };

  const handleUrlTrack = async () => {
    const url = jobUrl.trim();
    if (!url) {
      setError("Paste a job posting URL first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const job = await createTrackedJob(url);
      onTracked(job);
      await startAssistantFlow(
        job,
        `I added this job: ${url}. Fetch the posting, tailor my best CV, write a cover letter, and link them to this application.`
      );
    } catch (trackError) {
      const message =
        trackError instanceof Error ? trackError.message : "Could not start tracking that job.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualTrack = async () => {
    const trimmedTitle = title.trim();
    const trimmedCompany = company.trim();
    if (!trimmedTitle) {
      setError("Enter a job title.");
      return;
    }
    if (!trimmedCompany) {
      setError("Enter a company name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const job = await createManualTrackedJob(trimmedTitle, trimmedCompany, description);
      onTracked(job);
      const descriptionHint = description.trim()
        ? `\n\nJob description:\n\n${description.trim()}`
        : "";
      await startAssistantFlow(
        job,
        `I added a job manually: ${trimmedTitle} at ${trimmedCompany}.${descriptionHint}\n\nTailor my best CV, write a cover letter, and link them to this application.`
      );
    } catch (trackError) {
      const message =
        trackError instanceof Error ? trackError.message : "Could not start tracking that job.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitUrl = jobUrl.trim().length > 0;
  const canSubmitManual = title.trim().length > 0 && company.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Track job</DialogTitle>
          <DialogDescription>
            {step === "url"
              ? "Paste a posting URL and Yuse will fetch details, tailor your CV, and draft a cover letter."
              : "Add the role details yourself when there is no posting link."}
          </DialogDescription>
        </DialogHeader>

        {step === "url" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="job-posting-url" className="text-sm font-medium">
                Job posting URL
              </label>
              <Input
                id="job-posting-url"
                type="url"
                placeholder="Paste LinkedIn or job posting URL"
                value={jobUrl}
                onChange={(event) => {
                  setJobUrl(event.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setError(null);
                setStep("manual");
              }}
            >
              <FileText className="size-4" />
              Enter details manually
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="job-title" className="text-sm font-medium">
                Job title
              </label>
              <Input
                id="job-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError(null);
                }}
                placeholder="Senior Product Designer"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="job-company" className="text-sm font-medium">
                Company
              </label>
              <Input
                id="job-company"
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setError(null);
                }}
                placeholder="Acme Corp"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="job-description" className="text-sm font-medium">
                Job description
                <span className="font-normal text-muted-foreground"> (optional)</span>
              </label>
              <Textarea
                id="job-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setError(null);
                }}
                placeholder="Paste the role summary or requirements"
                disabled={isSubmitting}
                rows={4}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "manual" ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setStep("url");
                setError(null);
              }}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={
              isSubmitting || (step === "url" ? !canSubmitUrl : !canSubmitManual)
            }
            onClick={() => void (step === "url" ? handleUrlTrack() : handleManualTrack())}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Tracking…
              </>
            ) : (
              "Track job"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
