"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileText } from "lucide-react";
import { JobLinkButton } from "@/components/jobs/job-link-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, JOB_STATUS_ORDER } from "@/lib/types/job";
import type { JobStatus, TrackedJob } from "@/lib/types/job";

interface JobKanbanProps {
  jobs: TrackedJob[];
  onStatusChange: (job: TrackedJob, status: JobStatus) => void;
  onSelect: (job: TrackedJob) => void;
  selectedJobId?: string | null;
}

function displayTitle(job: TrackedJob) {
  if (job.title.trim()) return job.title;
  return "Untitled role";
}

function displayCompany(job: TrackedJob) {
  if (job.company.trim()) return job.company;
  return "Company pending";
}

function resolveDropStatus(overId: string | number, jobs: TrackedJob[]): JobStatus | null {
  const id = String(overId);
  if (JOB_STATUS_ORDER.includes(id as JobStatus)) {
    return id as JobStatus;
  }
  const overJob = jobs.find((job) => job.id === id);
  return overJob?.status ?? null;
}

interface JobCardContentProps {
  job: TrackedJob;
  onSelect?: (job: TrackedJob) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function JobCardContent({
  job,
  onSelect,
  isSelected,
  isDragging,
  isOverlay,
}: JobCardContentProps) {
  return (
    <Card
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(job) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(job);
              }
            }
          : undefined
      }
      className={cn(
        "gap-2 rounded-lg border bg-card p-3 shadow-sm transition-[opacity,box-shadow,transform] duration-200 ease-out",
        onSelect && "cursor-grab hover:shadow-md active:cursor-grabbing",
        isSelected && "border-primary/50 ring-1 ring-primary/20",
        isDragging && "opacity-40 shadow-none",
        isOverlay && "pointer-events-none shadow-lg"
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium leading-snug">{displayTitle(job)}</p>
        <p className="text-xs text-muted-foreground">{displayCompany(job)}</p>
      </div>
      <div className="flex items-center gap-2">
        <JobLinkButton url={job.url} />
      </div>
      {(job.resumeId || job.coverLetter.trim()) && (
        <div className="flex flex-wrap gap-1.5">
          {job.resumeId ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <FileText className="size-3" />
              CV linked
            </span>
          ) : null}
          {job.coverLetter.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <FileText className="size-3" />
              Cover letter
            </span>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function DragOverlayCard({ job }: { job: TrackedJob }) {
  const [tilted, setTilted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTilted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn(
        "w-72 transition-transform duration-200 ease-out will-change-transform",
        tilted ? "rotate-1" : "rotate-0"
      )}
    >
      <JobCardContent job={job} isOverlay />
    </div>
  );
}

function DraggableJobCard({
  job,
  onSelect,
  isSelected,
}: {
  job: TrackedJob;
  onSelect: (job: TrackedJob) => void;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { type: "job", job },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none"
      {...listeners}
      {...attributes}
    >
      <JobCardContent
        job={job}
        onSelect={onSelect}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  );
}

function KanbanColumn({
  status,
  jobs,
  onSelect,
  selectedJobId,
}: {
  status: JobStatus;
  jobs: TrackedJob[];
  onSelect: (job: TrackedJob) => void;
  selectedJobId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const columnJobs = jobs.filter((job) => job.status === status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight">{JOB_STATUS_LABELS[status]}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {columnJobs.length}
        </Badge>
      </div>
      <div className="flex min-h-36 flex-1 flex-col gap-2 p-2">
        {columnJobs.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg border border-dashed border-transparent px-3 py-8 text-center",
              isOver && "border-primary/30 bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">
              {isOver ? "Release to move here" : "Drop applications here"}
            </p>
          </div>
        ) : (
          columnJobs.map((job) => (
            <DraggableJobCard
              key={job.id}
              job={job}
              onSelect={onSelect}
              isSelected={job.id === selectedJobId}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function JobKanban({ jobs, onStatusChange, onSelect, selectedJobId }: JobKanbanProps) {
  const [activeJob, setActiveJob] = useState<TrackedJob | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const job = jobs.find((item) => item.id === event.active.id);
    setActiveJob(job ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const job = jobs.find((item) => item.id === active.id);
    if (!job) return;

    const newStatus = resolveDropStatus(over.id, jobs);
    if (!newStatus || job.status === newStatus) return;

    onStatusChange(job, newStatus);
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-16 text-center">
        <p className="text-sm font-medium">No tracked jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a job URL above and Yuse will tailor your application.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {JOB_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            jobs={jobs}
            onSelect={onSelect}
            selectedJobId={selectedJobId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeJob ? <DragOverlayCard job={activeJob} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
