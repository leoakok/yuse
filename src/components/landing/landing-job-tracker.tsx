"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { JobKanbanPanel } from "@/components/jobs/job-kanban-panel";
import { Reveal } from "@/components/landing/reveal";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_TRACKED_JOBS } from "@/lib/landing/job-tracker-demo-jobs";
import { cn } from "@/lib/utils";
import type { JobStatus, TrackedJob } from "@/lib/types/job";

type LandingJobTrackerProps = {
  isSignedIn?: boolean;
};

export function LandingJobTracker({ isSignedIn = false }: LandingJobTrackerProps) {
  const [jobs, setJobs] = useState(DEMO_TRACKED_JOBS);

  function handleStatusChange(job: TrackedJob, status: JobStatus) {
    setJobs((current) =>
      current.map((item) => (item.id === job.id ? { ...item, status } : item)),
    );
  }

  return (
    <section id="job-tracker" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-serif text-3xl tracking-tight sm:text-4xl">
            Track every application in one place
          </h2>
        </Reveal>

        <Reveal className="mt-10" delay={80}>
          <div className="overflow-hidden border border-border/60 bg-muted/20 p-3 sm:p-4">
            <JobKanbanPanel
              className="h-[min(28rem,60vh)]"
              jobs={jobs}
              onStatusChange={handleStatusChange}
            />
          </div>
        </Reveal>

        {!isSignedIn ? (
          <Reveal className="mt-8 flex justify-center" delay={120}>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-5")}
            >
              Start tracking your applications
              <ArrowRight />
            </Link>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
