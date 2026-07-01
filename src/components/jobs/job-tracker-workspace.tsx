"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { JobDetailPanel } from "@/components/jobs/job-detail-panel";
import { JobKanbanPanel } from "@/components/jobs/job-kanban-panel";
import { JobTrackDialog } from "@/components/jobs/job-track-dialog";
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
import { cn } from "@/lib/utils";
import {
  deleteTrackedJob,
  listResumes,
  listTrackedJobs,
  updateTrackedJob,
} from "@/lib/api/cv-api";
import { getJobDescription } from "@/lib/types/job";
import type { Resume } from "@/lib/types/cv";
import type { JobStatus, TrackedJob, UpdateTrackedJobInput } from "@/lib/types/job";

type ViewMode = "kanban" | "table";

interface JobTrackerWorkspaceProps {
  trackDialogOpen?: boolean;
  onTrackDialogOpenChange?: (open: boolean) => void;
}

export function JobTrackerWorkspace({
  trackDialogOpen = false,
  onTrackDialogOpenChange,
}: JobTrackerWorkspaceProps) {
  const { refreshKey, startNewChat, sendMessage, setOpen } = useCvAssistant();
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
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
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6">
      <div className="flex shrink-0 items-center justify-end gap-3">
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
        <JobKanbanPanel
          jobs={jobs}
          onStatusChange={handleStatusChange}
          onSelect={(job) => setSelectedJobId(job.id)}
          selectedJobId={selectedJobId}
        />
      ) : (
        <div className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto">
          <JobTable
            jobs={jobs}
            onDelete={setDeleteTarget}
            onSelect={(job) => setSelectedJobId(job.id)}
            selectedJobId={selectedJobId}
          />
        </div>
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
        onDelete={setDeleteTarget}
        isRegenerating={isRegenerating}
      />

      {onTrackDialogOpenChange ? (
        <JobTrackDialog
          open={trackDialogOpen}
          onOpenChange={onTrackDialogOpenChange}
          onTracked={(job) => setJobs((current) => [job, ...current])}
        />
      ) : null}

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
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
