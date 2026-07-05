import {
  WorkspaceSection,
  WorkspaceSections,
} from "@/components/layout/workspace-section";

export function AdminSystemPanel() {
  return (
    <WorkspaceSections>
      <WorkspaceSection title="Rate limits">
        <p className="text-sm text-muted-foreground">
          Per-instance counters are active on auth, waitlist, GraphQL, and assistant routes.
          Use Redis or Cloudflare for multi-instance production.
        </p>
      </WorkspaceSection>
      <WorkspaceSection title="Beta access">
        <p className="text-sm text-muted-foreground">
          Set <code className="text-xs">BETA_INVITE_ONLY=true</code> on the backend to require
          waitlist approval for new signups. Existing accounts keep access.
        </p>
      </WorkspaceSection>
    </WorkspaceSections>
  );
}
