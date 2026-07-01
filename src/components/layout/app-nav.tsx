"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PRIMARY_NAV,
  isPortfoliosNavActive,
  isResumesNavActive,
  isJobTrackerNavActive,
} from "@/lib/nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";
import {
  floatingChipClassName,
  floatingChipGroupClassName,
  floatingChipNavLinkClassName,
} from "@/lib/ui/floating-chip";
import { motionTransitionColors } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, id: string) {
  return (
    (id === "resumes" && isResumesNavActive(pathname)) ||
    (id === "job-tracker" && isJobTrackerNavActive(pathname)) ||
    (id === "portfolios" && isPortfoliosNavActive(pathname))
  );
}

function groupedNavLinkClassName(isActive: boolean, className?: string) {
  return cn(
    floatingChipNavLinkClassName,
    motionTransitionColors,
    isActive
      ? "bg-accent text-accent-foreground shadow-sm"
      : "text-muted-foreground",
    className
  );
}

function standaloneNavLinkClassName(isActive: boolean, className?: string) {
  return cn(
    floatingChipClassName,
    "text-sm font-medium",
    motionTransitionColors,
    isActive
      ? "border-primary/40 bg-accent text-accent-foreground shadow-md"
      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    className
  );
}

interface NavLinksProps {
  className?: string;
  linkClassName?: string;
  orientation?: "horizontal" | "vertical";
  grouped?: boolean;
  showAccount?: boolean;
  onNavigate?: () => void;
}

export function NavLinks({
  className,
  linkClassName,
  orientation = "horizontal",
  grouped = false,
  showAccount = false,
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const isGroupedHorizontal = grouped && orientation === "horizontal";

  return (
    <nav
      className={cn(
        isGroupedHorizontal
          ? floatingChipGroupClassName
          : orientation === "horizontal"
            ? "flex items-center justify-center gap-2"
            : "flex flex-col gap-2 p-4",
        className
      )}
    >
      {PRIMARY_NAV.map((item) => {
        const isActive = isNavItemActive(pathname, item.id);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={
              isGroupedHorizontal
                ? groupedNavLinkClassName(
                    isActive,
                    cn(orientation === "vertical" && "w-full justify-center", linkClassName)
                  )
                : standaloneNavLinkClassName(
                    isActive,
                    cn(orientation === "vertical" && "w-full justify-center", linkClassName)
                  )
            }
          >
            {item.label}
          </Link>
        );
      })}
      {isGroupedHorizontal && showAccount ? (
        <>
          <div
            className="mx-0.5 h-5 w-px shrink-0 bg-border/60"
            aria-hidden
          />
          <UserMenuButton variant="grouped" />
        </>
      ) : null}
    </nav>
  );
}

interface AppNavProps {
  showAccount?: boolean;
}

export function AppNav({ showAccount = true }: AppNavProps) {
  return (
    <NavLinks grouped showAccount={showAccount} className="hidden md:flex" />
  );
}
