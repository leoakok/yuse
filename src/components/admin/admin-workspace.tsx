"use client";

import { useState } from "react";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminWaitlistPanel } from "@/components/admin/admin-waitlist-panel";
import { AdminAuditPanel } from "@/components/admin/admin-audit-panel";
import { AdminEmailTesterPanel } from "@/components/admin/admin-email-tester-panel";
import { AdminInvitesPanel } from "@/components/admin/admin-invites-panel";
import { AdminLinkedInPanel } from "@/components/admin/admin-linkedin-panel";
import { AdminAutomationsPanel } from "@/components/admin/admin-automations-panel";
import type { AdminSection } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const FULL_HEIGHT_SECTIONS: AdminSection[] = ["linkedin", "automations"];

export function AdminWorkspace() {
  const [section, setSection] = useState<AdminSection>("users");
  const fullHeight = FULL_HEIGHT_SECTIONS.includes(section);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 overflow-hidden border-t border-border/60 bg-background">
      <aside className="hidden w-44 shrink-0 border-r border-border/60 md:block lg:w-48">
        <div className="border-b border-border/60 px-4 py-3 lg:px-5">
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
          <select
            id="admin-section"
            value={section}
            onChange={(event) => setSection(event.target.value as AdminSection)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="users">Users</option>
            <option value="waitlist">Waitlist</option>
            <option value="invites">Invites</option>
            <option value="automations">Automations</option>
            <option value="linkedin">LinkedIn</option>
            <option value="audit">Audit log</option>
            <option value="emails">Email tester</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1",
            fullHeight ? "flex flex-col overflow-hidden" : "overflow-y-auto p-4 lg:p-5",
          )}
        >
          <div className={cn(section !== "users" && "hidden", !fullHeight && "max-w-5xl")}>
            <AdminUsersPanel />
          </div>
          <div className={cn(section !== "waitlist" && "hidden", !fullHeight && "max-w-5xl")}>
            <AdminWaitlistPanel />
          </div>
          <div className={cn(section !== "invites" && "hidden", !fullHeight && "max-w-5xl")}>
            <AdminInvitesPanel />
          </div>
          <div className={cn(section !== "audit" && "hidden", !fullHeight && "max-w-5xl")}>
            <AdminAuditPanel />
          </div>
          <div className={cn(section !== "emails" && "hidden", !fullHeight && "max-w-2xl")}>
            <AdminEmailTesterPanel />
          </div>
          {section === "linkedin" ? <AdminLinkedInPanel /> : null}
          {section === "automations" ? <AdminAutomationsPanel /> : null}
          <div className={cn(section !== "agent" && "hidden", "mx-auto max-w-5xl space-y-8")}>
            <IntentPlayground />
            <KnowledgeDictionary />
          </div>
        </div>
      </div>
    </div>
  );
}
