"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Recycle } from "lucide-react";
import { toast } from "sonner";
import { JobLinkButton } from "@/components/jobs/job-link-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { resumePath } from "@/lib/cv/routes";
import type { Resume } from "@/lib/types/cv";
import {
  getJobDescription,
  isJobFetchIncomplete,
  JOB_STATUS_LABELS,
  JOB_STATUS_ORDER,
  mergeTrackedJobMetadata,
  type JobStatus,
  type TrackedJob,
  type UpdateTrackedJobInput,
} from "@/lib/types/job";

interface JobDetailPanelProps {
  job: TrackedJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: Resume[];
  onSave: (input: UpdateTrackedJobInput) => Promise<TrackedJob>;
  onRegenerateCoverLetter: (job: TrackedJob) => Promise<void>;
  isRegenerating?: boolean;
}

function displayTitle(job: TrackedJob) {
  return job.title.trim() || "Untitled role";
}

function displayCompany(job: TrackedJob) {
  return job.company.trim() || "Company pending";
}

export function JobDetailPanel({
  job,
  open,
  onOpenChange,
  resumes,
  onSave,
  onRegenerateCoverLetter,
  isRegenerating = false,
}: JobDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<JobStatus>("SAVED");
  const [notes, setNotes] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeId, setResumeId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!job || !open) return;
    setTitle(job.title);
    setCompany(job.company);
    setStatus(job.status);
    setNotes(job.notes);
    setCoverLetter(job.coverLetter);
    setJobDescription(getJobDescription(job));
    setResumeId(job.resumeId ?? "");
  }, [job, open]);

  const linkedResume = useMemo(
    () => resumes.find((resume) => resume.id === resumeId),
    [resumeId, resumes]
  );

  const showDescriptionHint = job ? isJobFetchIncomplete(job) : false;

  async function handleSave() {
    if (!job) return;

    setIsSaving(true);
    try {
      const updated = await onSave({
        id: job.id,
        title: title.trim(),
        company: company.trim(),
        status,
        notes,
        coverLetter,
        resumeId: resumeId || "",
        metadata: mergeTrackedJobMetadata(job, {
          description: jobDescription.trim(),
        }),
      });
      setTitle(updated.title);
      setCompany(updated.company);
      setStatus(updated.status);
      setNotes(updated.notes);
      setCoverLetter(updated.coverLetter);
      setJobDescription(getJobDescription(updated));
      setResumeId(updated.resumeId ?? "");
      toast.success("Application saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!job) return;
    try {
      await onRegenerateCoverLetter(job);
      toast.success("Yuse is rewriting your cover letter.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start cover letter regeneration."
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {job ? (
          <>
            <SheetHeader className="border-b px-4 py-4 pr-12">
              <SheetTitle className="text-left leading-snug">{displayTitle(job)}</SheetTitle>
              <SheetDescription className="text-left">{displayCompany(job)}</SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-5 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="job-detail-status" className="text-sm font-medium">
                      Status
                    </label>
                    <Select
                      value={status}
                      onValueChange={(value) => {
                        if (value) setStatus(value as JobStatus);
                      }}
                    >
                      <SelectTrigger id="job-detail-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_STATUS_ORDER.map((item) => (
                          <SelectItem key={item} value={item}>
                            {JOB_STATUS_LABELS[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Posting</span>
                    <div className="flex h-9 items-center">
                      <JobLinkButton url={job.url} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="job-detail-company" className="text-sm font-medium">
                      Company
                    </label>
                    <Input
                      id="job-detail-company"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="job-detail-title" className="text-sm font-medium">
                      Role
                    </label>
                    <Input
                      id="job-detail-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Job title"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-detail-resume" className="text-sm font-medium">
                    Tailored CV
                  </label>
                  <Select
                    value={resumeId || "none"}
                    onValueChange={(value) => {
                      if (!value) return;
                      setResumeId(value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger id="job-detail-resume" className="w-full">
                      <SelectValue placeholder="Choose a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CV linked</SelectItem>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedResume ? (
                    <Link
                      href={resumePath(linkedResume.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Open {linkedResume.title}
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : resumes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No resumes yet — ask Yuse to tailor one for this role.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="job-detail-description" className="text-sm font-medium">
                      Job description
                    </label>
                    {showDescriptionHint ? (
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        Paste if fetch failed
                      </span>
                    ) : null}
                  </div>
                  <Textarea
                    id="job-detail-description"
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste the job posting here if Yuse could not fetch the URL, or to override what was saved."
                    className="min-h-28"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="job-detail-cover-letter" className="text-sm font-medium">
                      Cover letter
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => void handleRegenerate()}
                      disabled={isRegenerating || isSaving}
                      aria-label="Regenerate cover letter with Yuse"
                    >
                      {isRegenerating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Recycle className="size-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="job-detail-cover-letter"
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    placeholder="Your tailored cover letter appears here after Yuse finishes."
                    className="min-h-40 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-detail-notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    id="job-detail-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Private notes — recruiter contacts, follow-ups, etc."
                    className="min-h-20"
                  />
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="border-t px-4 py-3">
              <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
