"use client";

import { CatalogShell } from "@/components/layout/catalog-shell";
import { JobTrackerWorkspace } from "@/components/jobs/job-tracker-workspace";

export default function JobTrackerPage() {
  return (
    <CatalogShell
      title="Job Tracker"
      description="Track applications, tailor your CV, and save cover letters with Yuse."
    >
      <JobTrackerWorkspace />
    </CatalogShell>
  );
}
