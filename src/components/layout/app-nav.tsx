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

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-center gap-1">
      {PRIMARY_NAV.map((item) => {
        const isActive =
          (item.id === "resumes" && isResumesNavActive(pathname)) ||
          (item.id === "job-tracker" && isJobTrackerNavActive(pathname)) ||
          (item.id === "portfolios" && isPortfoliosNavActive(pathname));
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
