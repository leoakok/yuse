"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, type JobStatus, type TrackedJob } from "@/lib/types/job";

const DEMO_STATUS_ORDER: JobStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"];

const DEMO_JOBS: TrackedJob[] = [
  {
    id: "demo-linear",
    workspaceId: "demo",
    url: "https://linear.app/careers/senior-frontend-engineer",
    title: "Senior Frontend Engineer",
    company: "Linear",
    status: "SAVED",
    notes: "",
    resumeId: "demo-cv-1",
    coverLetter: "",
    metadata: {},
    createdBy: "demo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-openai",
    workspaceId: "demo",
    url: "https://openai.com/careers/ml-engineer",
    title: "Machine Learning Engineer",
    company: "OpenAI",
    status: "APPLIED",
    notes: "",
    resumeId: "demo-cv-2",
    coverLetter: "Tailored cover letter",
    metadata: {},
    createdBy: "demo",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "demo-figma",
    workspaceId: "demo",
    url: "https://figma.com/careers/product-designer",
    title: "Product Designer",
    company: "Figma",
    status: "APPLIED",
    notes: "",
    resumeId: "demo-cv-3",
    coverLetter: "",
    metadata: {},
    createdBy: "demo",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "demo-stripe",
    workspaceId: "demo",
    url: "https://stripe.com/jobs/staff-engineer",
    title: "Staff Engineer",
    company: "Stripe",
    status: "INTERVIEW",
    notes: "",
    resumeId: "demo-cv-4",
    coverLetter: "Tailored cover letter",
    metadata: {},
    createdBy: "demo",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "demo-startup",
    workspaceId: "demo",
    url: "https://example.com/jobs/founding-engineer",
    title: "Founding Engineer",
    company: "Seed-stage startup",
    status: "OFFER",
    notes: "",
    resumeId: "demo-cv-5",
    coverLetter: "",
    metadata: {},
    createdBy: "demo",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
];

function resolveDropStatus(overId: string | number, jobs: TrackedJob[]): JobStatus | null {
  const id = String(overId);
  if (DEMO_STATUS_ORDER.includes(id as JobStatus)) {
    return id as JobStatus;
  }
  const overJob = jobs.find((job) => job.id === id);
  return overJob?.status ?? null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

interface DemoJobCardProps {
  job: TrackedJob;
  isDragging?: boolean;
}

function DemoJobCard({ job, isDragging }: DemoJobCardProps) {
  return (
    <Card
      className={cn(
        "gap-2 rounded-lg border bg-card p-3 shadow-sm transition-[box-shadow,transform] duration-200 ease-out",
        "cursor-grab hover:shadow-md active:cursor-grabbing",
        isDragging && "shadow-lg",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium leading-snug">{job.title}</p>
        <p className="text-xs text-muted-foreground">{job.company}</p>
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

function DraggableDemoJobCard({ job }: { job: TrackedJob }) {
  const reducedMotion = usePrefersReducedMotion();
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
      className={cn("touch-none", isDragging && "z-50")}
      {...listeners}
      {...attributes}
    >
      <div
        className={cn(
          "transition-transform duration-200 ease-out will-change-transform",
          isDragging && !reducedMotion && "rotate-1",
        )}
      >
        <DemoJobCard job={job} isDragging={isDragging} />
      </div>
    </div>
  );
}

function StaticDemoKanbanColumn({
  status,
  jobs,
}: {
  status: JobStatus;
  jobs: TrackedJob[];
}) {
  const columnJobs = jobs.filter((job) => job.status === status);

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 sm:w-72">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight">
          {JOB_STATUS_LABELS[status]}
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {columnJobs.length}
        </Badge>
      </div>
      <div className="flex min-h-32 flex-1 flex-col gap-2 p-2">
        {columnJobs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-transparent px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">Drop applications here</p>
          </div>
        ) : (
          columnJobs.map((job) => <DemoJobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}

function DemoKanbanColumn({
  status,
  jobs,
}: {
  status: JobStatus;
  jobs: TrackedJob[];
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
        "flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors sm:w-72",
        isOver && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight">
          {JOB_STATUS_LABELS[status]}
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {columnJobs.length}
        </Badge>
      </div>
      <div className="flex min-h-32 flex-1 flex-col gap-2 p-2">
        {columnJobs.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg border border-dashed border-transparent px-3 py-8 text-center",
              isOver && "border-primary/30 bg-primary/5",
            )}
          >
            <p className="text-xs text-muted-foreground">
              {isOver ? "Release to move here" : "Drop applications here"}
            </p>
          </div>
        ) : (
          columnJobs.map((job) => <DraggableDemoJobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}

export function JobTrackerDemo() {
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const job = jobs.find((item) => item.id === active.id);
    if (!job) return;

    const newStatus = resolveDropStatus(over.id, jobs);
    if (!newStatus || job.status === newStatus) return;

    setJobs((current) =>
      current.map((item) =>
        item.id === job.id ? { ...item, status: newStatus } : item,
      ),
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <p className="mb-4 text-center text-xs text-muted-foreground sm:text-left">
        Try dragging a card between columns — same board you&apos;ll use in the app.
      </p>
      {mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {DEMO_STATUS_ORDER.map((status) => (
              <DemoKanbanColumn key={status} status={status} jobs={jobs} />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2" aria-hidden>
          {DEMO_STATUS_ORDER.map((status) => (
            <StaticDemoKanbanColumn key={status} status={status} jobs={jobs} />
          ))}
        </div>
      )}
    </div>
  );
}
