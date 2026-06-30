import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { ContentLoading } from "@/components/layout/content-loading";
import { MobileNav } from "@/components/layout/mobile-nav";
import { YuseLogo } from "@/components/brand/yuse-logo";

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-1">
          <MobileNav />
          <Link
            href="/resumes"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <YuseLogo className="size-5" />
            Yuse
          </Link>
        </div>
        <AppNav />
        <div className="hidden md:block" aria-hidden="true" />
      </header>
      <ContentLoading className="flex-1" label="Loading workspace" />
    </div>
  );
}
