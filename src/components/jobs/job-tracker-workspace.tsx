"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JobDetailPanel } from "@/components/jobs/job-detail-panel";
import { JobKanban } from "@/components/jobs/job-kanban";
import { JobTable } from "@/components/jobs/job-table";
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
import { cn } from "@/lib/utils";
import {
  createTrackedJob,
  deleteTrackedJob,
  listResumes,
  listTrackedJobs,
  updateTrackedJob,
} from "@/lib/api/cv-api";
import { getJobDescription } from "@/lib/types/job";
import type { Resume } from "@/lib/types/cv";
import type { JobStatus, TrackedJob, UpdateTrackedJobInput } from "@/lib/types/job";

type ViewMode = "kanban" | "table";

export function JobTrackerWorkspace() {
  const { refreshKey, startNewChat, sendMessage, setOpen } = useCvAssistant();
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [jobUrl, setJobUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrackedJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const loadJobs = useCallback(() => {
    void listTrackedJobs().then(setJobs);
  }, []);

  const loadResumes = useCallback(() => {
    void listResumes().then(setResumes);
  }, []);

  useEffect(() => {
    loadJobs();
    loadResumes();
  }, [loadJobs, loadResumes, refreshKey]);

  async function handleTrackJob(event: React.FormEvent) {
    event.preventDefault();
    const url = jobUrl.trim();
    if (!url) {
      toast.error("Paste a job posting URL first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await createTrackedJob(url);
      setJobs((current) => [job, ...current]);
      setJobUrl("");

      const thread = await startNewChat();
      setOpen(true);
      await sendMessage(
        `I added this job: ${url}. Fetch the posting, tailor my best CV, write a cover letter, and link them to this application.`,
        [],
        {
          threadId: thread.id,
          contextOverride: { view: "job_tracker", jobId: job.id },
        }
      );
      toast.success("Yuse is preparing your application.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start tracking that job."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(job: TrackedJob, status: JobStatus) {
    if (job.status === status) return;

    const previous = jobs;
    setJobs((current) =>
      current.map((item) => (item.id === job.id ? { ...item, status } : item))
    );

    try {
      const updated = await updateTrackedJob({ id: job.id, status });
      setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setJobs(previous);
      toast.error(error instanceof Error ? error.message : "Could not update status.");
    }
  }

  async function handleSaveJob(input: UpdateTrackedJobInput) {
    const updated = await updateTrackedJob(input);
    setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  }

  async function handleRegenerateCoverLetter(job: TrackedJob) {
    setIsRegenerating(true);
    try {
      const description = getJobDescription(job).trim();
      const descriptionHint = description
        ? `this job description:\n\n${description}`
        : job.url.trim()
          ? `the posting at ${job.url}`
          : "the saved job details";

      const thread = await startNewChat();
      setOpen(true);
      await sendMessage(
        `Regenerate the cover letter for this application using ${descriptionHint}. Update the tracked job with the new letter.`,
        [],
        {
          threadId: thread.id,
          contextOverride: { view: "job_tracker", jobId: job.id },
        }
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const deleted = await deleteTrackedJob(deleteTarget.id);
      if (!deleted) {
        toast.error("Could not delete that application.");
        return;
      }
      setJobs((current) => current.filter((job) => job.id !== deleteTarget.id));
      if (selectedJobId === deleteTarget.id) {
        setSelectedJobId(null);
      }
      setDeleteTarget(null);
      toast.success("Application removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete application.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleTrackJob} className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="url"
          placeholder="Paste LinkedIn or job posting URL"
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button type="submit" disabled={isSubmitting || !jobUrl.trim()} className="shrink-0">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Tracking…
            </>
          ) : (
            "Track job"
          )}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Yuse fetches the posting, tailors your CV, and writes a cover letter in chat.
        </p>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              viewMode === "kanban"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              viewMode === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-3.5" />
            Table
          </button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <JobKanban
          jobs={jobs}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteTarget}
          onSelect={(job) => setSelectedJobId(job.id)}
          selectedJobId={selectedJobId}
        />
      ) : (
        <JobTable
          jobs={jobs}
          onDelete={setDeleteTarget}
          onSelect={(job) => setSelectedJobId(job.id)}
          selectedJobId={selectedJobId}
        />
      )}

      <JobDetailPanel
        job={selectedJob}
        open={selectedJob != null}
        onOpenChange={(open) => {
          if (!open) setSelectedJobId(null);
        }}
        resumes={resumes}
        onSave={handleSaveJob}
        onRegenerateCoverLetter={handleRegenerateCoverLetter}
        isRegenerating={isRegenerating}
      />

      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete application?</DialogTitle>
            <DialogDescription>
              This removes the tracked job
              {deleteTarget?.title || deleteTarget?.company
                ? ` for ${[deleteTarget?.title, deleteTarget?.company].filter(Boolean).join(" at ")}`
                : ""}
              . Your tailored resume and cover letter stay in your workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
