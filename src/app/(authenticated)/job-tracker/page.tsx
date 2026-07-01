"use client";

import { useState } from "react";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { JobTrackerWorkspace } from "@/components/jobs/job-tracker-workspace";
import { Button } from "@/components/ui/button";

export default function JobTrackerPage() {
  const [trackOpen, setTrackOpen] = useState(false);

  return (
    <CatalogShell
      title="Job Tracker"
      description="Track applications, tailor your CV, and save cover letters with Yuse."
      fillHeight
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTrackOpen(true)}
        >
          Track job
        </Button>
      }
    >
      <JobTrackerWorkspace
        trackDialogOpen={trackOpen}
        onTrackDialogOpenChange={setTrackOpen}
      />
    </CatalogShell>
  );
}
