export type JobStatus = "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface TrackedJob {
  id: string;
  workspaceId: string;
  url: string;
  title: string;
  company: string;
  status: JobStatus;
  notes: string;
  resumeId?: string;
  coverLetter: string;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const JOB_STATUS_ORDER: JobStatus[] = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const JOB_STATUS_BADGE_CLASS: Record<JobStatus, string> = {
  SAVED: "bg-muted text-muted-foreground",
  APPLIED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  INTERVIEW: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  OFFER: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-destructive/10 text-destructive",
};

export interface UpdateTrackedJobInput {
  id: string;
  title?: string;
  company?: string;
  status?: JobStatus;
  notes?: string;
  resumeId?: string;
  coverLetter?: string;
  metadata?: Record<string, unknown>;
}

export function getJobDescription(job: TrackedJob): string {
  const value = job.metadata?.description;
  return typeof value === "string" ? value : "";
}

export function isJobFetchIncomplete(job: TrackedJob): boolean {
  if (getJobDescription(job).trim()) return false;
  return !job.title.trim() || !job.company.trim();
}

export function mergeTrackedJobMetadata(
  job: TrackedJob,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...job.metadata, ...patch };
}
