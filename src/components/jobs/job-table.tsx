"use client";

import { Trash2 } from "lucide-react";
import { JobLinkButton } from "@/components/jobs/job-link-button";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { JOB_STATUS_BADGE_CLASS, JOB_STATUS_LABELS } from "@/lib/types/job";
import type { TrackedJob } from "@/lib/types/job";

interface JobTableProps {
  jobs: TrackedJob[];
  loading?: boolean;
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

export function JobTable({ jobs, loading = false, onDelete, onSelect, selectedJobId }: JobTableProps) {
  if (!loading && jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-16 text-center">
        <p className="text-sm font-medium">No tracked jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Track job to add an application.
        </p>
      </div>
    );
  }

  return (
    <DataTable minWidth="720px" aria-busy={loading || undefined}>
      <DataTableHeader>
        <tr>
          <DataTableHead>Company</DataTableHead>
          <DataTableHead>Role</DataTableHead>
          <DataTableHead>Status</DataTableHead>
          <DataTableHead>URL</DataTableHead>
          <DataTableHead>Added</DataTableHead>
          <DataTableHead className="text-right">Actions</DataTableHead>
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {loading && jobs.length === 0 ? (
          <DataTableRow>
            <DataTableCell colSpan={6} className="py-16 text-center text-muted-foreground">
              Loading jobs…
            </DataTableCell>
          </DataTableRow>
        ) : (
          jobs.map((job) => (
            <DataTableRow
              key={job.id}
              onClick={() => onSelect(job)}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/20",
                job.id === selectedJobId && "bg-primary/5 hover:bg-primary/10"
              )}
            >
              <DataTableCell>{job.company.trim() || "-"}</DataTableCell>
              <DataTableCell className="font-medium">{job.title.trim() || "Untitled role"}</DataTableCell>
              <DataTableCell>
                <StatusBadge status={job.status} />
              </DataTableCell>
              <DataTableCell>
                <JobLinkButton url={job.url} />
              </DataTableCell>
              <DataTableCell muted>{formatDate(job.createdAt)}</DataTableCell>
              <DataTableCell className="text-right">
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
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  );
}
