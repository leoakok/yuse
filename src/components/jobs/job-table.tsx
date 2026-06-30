"use client";

import { Trash2 } from "lucide-react";
import { JobLinkButton } from "@/components/jobs/job-link-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JOB_STATUS_BADGE_CLASS, JOB_STATUS_LABELS } from "@/lib/types/job";
import type { TrackedJob } from "@/lib/types/job";

interface JobTableProps {
  jobs: TrackedJob[];
  onDelete: (job: TrackedJob) => void;
  onSelect: (job: TrackedJob) => void;
  selectedJobId?: string | null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: TrackedJob["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        JOB_STATUS_BADGE_CLASS[status]
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

export function JobTable({ jobs, onDelete, onSelect, selectedJobId }: JobTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-16 text-center">
        <p className="text-sm font-medium">No tracked jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a job URL above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className={cn(
                  "cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/20",
                  job.id === selectedJobId && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <td className="px-4 py-3">{job.company.trim() || "-"}</td>
                <td className="px-4 py-3 font-medium">{job.title.trim() || "Untitled role"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <JobLinkButton url={job.url} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(job.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(job);
                    }}
                    aria-label="Delete application"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
