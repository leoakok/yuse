"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { WELCOME_PATH } from "@/components/agent/cv-assistant-shell";
import { AppNav } from "@/components/layout/app-nav";
import { DevToolsMenu } from "@/components/layout/dev-tools-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";
import { motionTransitionColors } from "@/lib/ui/motion";
import { topbarTrackClassName } from "@/lib/ui/topbar-nav";
import { cn } from "@/lib/utils";

interface AppChromeProps {
  actions?: ReactNode;
  showAccount?: boolean;
}

export function AppChrome({ actions, showAccount = true }: AppChromeProps) {
  const pathname = usePathname() ?? "";

  if (pathname === WELCOME_PATH) {
    return null;
  }

  return (
    <header className="shrink-0 border-b border-border/60 bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <Link
            href="/resumes"
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              motionTransitionColors,
              "text-foreground hover:text-foreground/80"
            )}
          >
            <YuseLogo className="size-7" role="img" aria-label="Yuse" />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              Yuse
            </span>
          </Link>
          <AppNav />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <DevToolsMenu />
          {showAccount ? (
            <div className={cn(topbarTrackClassName, "hidden md:flex")}>
              <UserMenuButton />
            </div>
          ) : null}
          <MobileNav showAccount={showAccount} />
        </div>
      </div>
    </header>
  );
}
