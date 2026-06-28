"use client";

import { useState } from "react";
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
import { FileText, GripVertical, Trash2 } from "lucide-react";
import { JobLinkButton } from "@/components/jobs/job-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, JOB_STATUS_ORDER } from "@/lib/types/job";
import type { JobStatus, TrackedJob } from "@/lib/types/job";

interface JobKanbanProps {
  jobs: TrackedJob[];
  onStatusChange: (job: TrackedJob, status: JobStatus) => void;
  onDelete: (job: TrackedJob) => void;
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
  onDelete: (job: TrackedJob) => void;
  onSelect: (job: TrackedJob) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
}

function JobCardContent({
  job,
  onDelete,
  onSelect,
  isSelected,
  isDragging,
  dragHandle,
}: JobCardContentProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(job)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(job);
        }
      }}
      className={cn(
        "cursor-pointer gap-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isSelected && "border-primary/50 ring-1 ring-primary/20",
        isDragging && "opacity-40 shadow-none"
      )}
    >
      <div className="flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium leading-snug">{displayTitle(job)}</p>
          <p className="text-xs text-muted-foreground">{displayCompany(job)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pl-6">
        <JobLinkButton url={job.url} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(job);
          }}
          aria-label="Delete application"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {(job.resumeId || job.coverLetter.trim()) && (
        <div className="flex flex-wrap gap-1.5 pl-6">
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

function DraggableJobCard({
  job,
  onDelete,
  onSelect,
  isSelected,
}: {
  job: TrackedJob;
  onDelete: (job: TrackedJob) => void;
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

  const dragHandle = (
    <button
      type="button"
      className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
      aria-label="Drag to change status"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <JobCardContent
        job={job}
        onDelete={onDelete}
        onSelect={onSelect}
        isSelected={isSelected}
        isDragging={isDragging}
        dragHandle={dragHandle}
      />
    </div>
  );
}

function KanbanColumn({
  status,
  jobs,
  onDelete,
  onSelect,
  selectedJobId,
}: {
  status: JobStatus;
  jobs: TrackedJob[];
  onDelete: (job: TrackedJob) => void;
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
              onDelete={onDelete}
              onSelect={onSelect}
              isSelected={job.id === selectedJobId}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function JobKanban({ jobs, onStatusChange, onDelete, onSelect, selectedJobId }: JobKanbanProps) {
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
            onDelete={onDelete}
            onSelect={onSelect}
            selectedJobId={selectedJobId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeJob ? (
          <div className="w-72 rotate-1 cursor-grabbing">
            <JobCardContent job={activeJob} onDelete={() => {}} onSelect={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
