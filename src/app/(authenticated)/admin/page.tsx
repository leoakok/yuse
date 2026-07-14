import { CatalogShell } from "@/components/layout/catalog-shell";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export default function AdminPage() {
  return (
    <CatalogShell fillHeight width="full" edgeToEdge>
      <AdminWorkspace />
    </CatalogShell>
  );
}
