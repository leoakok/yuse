import { Suspense } from "react";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <CatalogShell
      title="Settings"
      description="Your account and preferences."
      width="narrow"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
        <SettingsWorkspace />
      </Suspense>
    </CatalogShell>
  );
}
