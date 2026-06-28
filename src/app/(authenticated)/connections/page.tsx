import { Suspense } from "react";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { ConnectionsWorkspace } from "@/components/connections/connections-workspace";
import { Skeleton } from "@/components/ui/skeleton";

function ConnectionsFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <CatalogShell
      title="Connections"
      description="Link accounts so Yuse can read your projects with better access and rate limits."
      width="narrow"
    >
      <Suspense fallback={<ConnectionsFallback />}>
        <ConnectionsWorkspace />
      </Suspense>
    </CatalogShell>
  );
}
