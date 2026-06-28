"use client";

import { CatalogShell } from "@/components/layout/catalog-shell";
import { TwinWorkspace } from "@/components/twin/twin-workspace";

export default function DigitalTwinPage() {
  return (
    <CatalogShell
      title="Digital Twin"
      description="Everything Yuse knows about your career. Grows as you chat — resumes pull from here."
    >
      <TwinWorkspace />
    </CatalogShell>
  );
}
