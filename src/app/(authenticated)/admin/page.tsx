import { CatalogShell } from "@/components/layout/catalog-shell";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export default function AdminPage() {
  return (
    <CatalogShell
      title="Admin"
      description="Tune how Yuse understands messages and what guidance it pulls in."
    >
      <AdminWorkspace />
    </CatalogShell>
  );
}
