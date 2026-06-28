import { CatalogShell } from "@/components/layout/catalog-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <CatalogShell
      title="Settings"
      description="Your account and how Yuse works."
      width="narrow"
    >
      <SettingsWorkspace />
    </CatalogShell>
  );
}
