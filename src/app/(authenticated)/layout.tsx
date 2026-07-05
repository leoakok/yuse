export const dynamic = "force-dynamic";

import { CvAssistantProvider } from "@/components/agent/cv-assistant-provider";
import { AuthenticatedAppShell } from "@/components/layout/authenticated-app-shell";
import { AuthSessionProvider } from "@/components/layout/auth-session-provider";
import { WorkspaceProvider } from "@/components/layout/workspace-provider";
export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthSessionProvider>
      <WorkspaceProvider>
        <CvAssistantProvider>
          <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
        </CvAssistantProvider>
      </WorkspaceProvider>
    </AuthSessionProvider>
  );
}
