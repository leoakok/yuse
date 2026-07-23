"use client";

import { useState } from "react";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { AdminNav, ADMIN_SECTION_OPTIONS } from "@/components/admin/admin-nav";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminWaitlistPanel } from "@/components/admin/admin-waitlist-panel";
import { AdminAuditPanel } from "@/components/admin/admin-audit-panel";
import { AdminEmailTesterPanel } from "@/components/admin/admin-email-tester-panel";
import { AdminInvitesPanel } from "@/components/admin/admin-invites-panel";
import { AdminLinkedInPanel } from "@/components/admin/admin-linkedin-panel";
import { AdminAutomationsPanel } from "@/components/admin/admin-automations-panel";
import { AdminThemesPanel } from "@/components/admin/admin-themes-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminSection } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const FULL_HEIGHT_SECTIONS: AdminSection[] = ["linkedin", "automations"];

export function AdminWorkspace() {
  const [section, setSection] = useState<AdminSection>("users");
  const fullHeight = FULL_HEIGHT_SECTIONS.includes(section);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-background">
      <aside className="hidden w-44 shrink-0 border-r border-border/60 md:flex md:flex-col lg:w-48">
        <div className="shrink-0 border-b border-border/60 px-4 py-3 lg:px-5">
          <h1 className="text-sm font-semibold tracking-tight">Admin</h1>
        </div>
        <AdminNav section={section} onSectionChange={setSection} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/60 px-3 py-2 md:hidden">
          <p className="mb-1.5 text-sm font-semibold tracking-tight">Admin</p>
          <label htmlFor="admin-section" className="sr-only">
            Admin section
          </label>
          <Select
            value={section}
            onValueChange={(value) => {
              if (value) setSection(value as AdminSection);
            }}
          >
            <SelectTrigger id="admin-section" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_SECTION_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1",
            fullHeight
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto p-4 lg:p-5",
            !fullHeight && section === "emails" && "max-w-2xl",
            !fullHeight && section === "agent" && "mx-auto max-w-5xl",
            !fullHeight &&
              section !== "emails" &&
              section !== "agent" &&
              "max-w-5xl",
          )}
        >
          {section === "users" ? <AdminUsersPanel /> : null}
          {section === "waitlist" ? <AdminWaitlistPanel /> : null}
          {section === "invites" ? <AdminInvitesPanel /> : null}
          {section === "audit" ? <AdminAuditPanel /> : null}
          {section === "emails" ? <AdminEmailTesterPanel /> : null}
          {section === "linkedin" ? <AdminLinkedInPanel /> : null}
          {section === "automations" ? <AdminAutomationsPanel /> : null}
          {section === "themes" ? <AdminThemesPanel /> : null}
          {section === "agent" ? (
            <div className="space-y-8">
              <IntentPlayground />
              <KnowledgeDictionary />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
