import Link from "next/link";
import type { ReactNode } from "react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { AppNav } from "@/components/layout/app-nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";

interface PageTitleProps {
  title: string;
  description?: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

interface PageHeaderProps {
  actions?: ReactNode;
}

export function PageHeader({ actions }: PageHeaderProps) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-4">
      <Link
        href="/resumes"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <YuseLogo className="size-5" />
        Yuse
      </Link>
      <AppNav />
      <div className="flex items-center justify-end gap-2">
        {actions}
        <UserMenuButton />
      </div>
    </header>
  );
}
