"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, isResumesNavActive, isDigitalTwinNavActive, isJobTrackerNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-center gap-1">
      {PRIMARY_NAV.map((item) => {
        if (item.enabled) {
          const isActive =
            (item.id === "resumes" && isResumesNavActive(pathname)) ||
            (item.id === "digital-twin" && isDigitalTwinNavActive(pathname)) ||
            (item.id === "job-tracker" && isJobTrackerNavActive(pathname));
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
        }

        return (
          <span
            key={item.id}
            className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/50"
            title="Coming soon"
          >
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}
