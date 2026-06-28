import { CvAssistantPanel } from "@/components/agent/cv-assistant-panel";
import { CvAssistantProvider } from "@/components/agent/cv-assistant-provider";
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
          {children}
          <CvAssistantPanel />
        </CvAssistantProvider>
      </WorkspaceProvider>
    </AuthSessionProvider>
  );
}
