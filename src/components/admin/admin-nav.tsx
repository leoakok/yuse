"use client";

import type { AdminSection } from "@/lib/types/admin";
import {
  workspaceRowClassName,
  workspaceRowListClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

type NavGroup = {
  label: string;
  items: Array<{ id: AdminSection; label: string }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "People",
    items: [
      { id: "users", label: "Users" },
      { id: "waitlist", label: "Waitlist" },
      { id: "invites", label: "Invites" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "automations", label: "Automations" },
      { id: "linkedin", label: "LinkedIn" },
      { id: "audit", label: "Audit log" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "emails", label: "Email tester" },
      { id: "agent", label: "Agent" },
    ],
  },
];

interface AdminNavProps {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  className?: string;
}

export function AdminNav({ section, onSectionChange, className }: AdminNavProps) {
  return (
    <nav className={cn("flex flex-col", className)} aria-label="Admin sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="border-b border-border/60 last:border-b-0">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground lg:px-5">
            {group.label}
          </p>
          <ul className={workspaceRowListClassName}>
            {group.items.map((item) => {
              const active = section === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full text-left",
                      workspaceRowClassName,
                      active
                        ? "bg-primary/5 font-medium text-foreground hover:bg-primary/5"
                        : "text-muted-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
