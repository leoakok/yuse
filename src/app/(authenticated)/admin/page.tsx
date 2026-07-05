import { CatalogShell } from "@/components/layout/catalog-shell";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export default function AdminPage() {
  return (
    <CatalogShell
      title="Admin"
      description="Manage beta access, users, and agent tuning."
    >
      <AdminWorkspace />
    </CatalogShell>
  );
}
