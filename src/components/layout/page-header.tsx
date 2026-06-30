import Link from "next/link";
import type { ReactNode } from "react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { AppNav } from "@/components/layout/app-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";

interface PageTitleProps {
  title: string;
  description?: string;
  /** Page-level actions (create, import), not global nav. */
  actions?: ReactNode;
}

export function PageTitle({ title, description, actions }: PageTitleProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>
      ) : null}
    </div>
  );
}

interface PageHeaderProps {
  /** Reserved for rare global chrome only. Prefer `PageTitle` actions on catalog pages. */
  actions?: ReactNode;
}

export function PageHeader({ actions }: PageHeaderProps) {
  return (
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
      <div className="flex items-center justify-end gap-2">
        {actions}
        <UserMenuButton />
      </div>
    </header>
  );
}
