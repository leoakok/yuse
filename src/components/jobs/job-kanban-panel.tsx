"use client";

import { JobKanban } from "@/components/jobs/job-kanban";
import { cn } from "@/lib/utils";
import type { JobStatus, TrackedJob } from "@/lib/types/job";

type JobKanbanPanelProps = {
  jobs: TrackedJob[];
  onStatusChange?: (job: TrackedJob, status: JobStatus) => void;
  onSelect?: (job: TrackedJob) => void;
  selectedJobId?: string | null;
  className?: string;
};

export function JobKanbanPanel({
  jobs,
  onStatusChange,
  onSelect,
  selectedJobId,
  className,
}: JobKanbanPanelProps) {
  return (
    <div
      className={cn(
        "min-h-0 min-w-0 w-full flex-1 flex flex-col overflow-hidden",
        className
      )}
    >
      <JobKanban
        className="h-full min-h-0 w-full"
        jobs={jobs}
        onStatusChange={onStatusChange}
        onSelect={onSelect}
        selectedJobId={selectedJobId}
      />
    </div>
  );
}
