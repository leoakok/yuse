"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PRIMARY_NAV,
  isPortfoliosNavActive,
  isResumesNavActive,
  isJobTrackerNavActive,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, id: string) {
  return (
    (id === "resumes" && isResumesNavActive(pathname)) ||
    (id === "job-tracker" && isJobTrackerNavActive(pathname)) ||
    (id === "portfolios" && isPortfoliosNavActive(pathname))
  );
}

function navLinkClassName(isActive: boolean, className?: string) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
    className
  );
}

interface NavLinksProps {
  className?: string;
  linkClassName?: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}

export function NavLinks({
  className,
  linkClassName,
  orientation = "horizontal",
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        orientation === "horizontal"
          ? "flex items-center justify-center gap-1"
          : "flex flex-col gap-1 p-4",
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
            className={navLinkClassName(
              isActive,
              cn(orientation === "vertical" && "px-4 py-2", linkClassName)
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav() {
  return <NavLinks className="hidden md:flex" />;
}
