import { ContentLoading } from "@/components/layout/content-loading";
import { FloatingAppChrome } from "@/components/layout/floating-app-chrome";

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <FloatingAppChrome showAccount={false} />
      <ContentLoading className="flex-1" label="Loading workspace" />
    </div>
  );
}
