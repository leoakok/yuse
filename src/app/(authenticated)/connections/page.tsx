import { CatalogShell } from "@/components/layout/catalog-shell";
import { ConnectionsWorkspace } from "@/components/connections/connections-workspace";

export default function ConnectionsPage() {
  return (
    <CatalogShell title="Connections" width="narrow">
      <ConnectionsWorkspace />
    </CatalogShell>
  );
}
