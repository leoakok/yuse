import { CatalogShell } from "@/components/layout/catalog-shell";
import { ConnectionsWorkspace } from "@/components/connections/connections-workspace";

export default function ConnectionsPage() {
  return (
    <CatalogShell
      title="Connections"
      description="Link accounts so Yuse can read your projects with better access and rate limits."
      width="narrow"
    >
      <ConnectionsWorkspace />
    </CatalogShell>
  );
}
