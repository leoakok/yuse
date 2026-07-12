"use client";

import { useState } from "react";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminWaitlistPanel } from "@/components/admin/admin-waitlist-panel";
import { AdminAuditPanel } from "@/components/admin/admin-audit-panel";
import { AdminSystemPanel } from "@/components/admin/admin-system-panel";
import { AdminEmailTesterPanel } from "@/components/admin/admin-email-tester-panel";
import { AdminInvitesPanel } from "@/components/admin/admin-invites-panel";
import { AdminLinkedInPanel } from "@/components/admin/admin-linkedin-panel";
import { AdminAutomationsPanel } from "@/components/admin/admin-automations-panel";
import { Button } from "@/components/ui/button";
import type { AdminSection } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: "users", label: "Users" },
  { id: "waitlist", label: "Waitlist" },
  { id: "invites", label: "Invite links" },
  { id: "audit", label: "Audit log" },
  { id: "emails", label: "Email tester" },
  { id: "linkedin", label: "LinkedIn test" },
  { id: "automations", label: "Automations" },
  { id: "agent", label: "Agent tools" },
  { id: "system", label: "System" },
];

export function AdminWorkspace() {
  const [section, setSection] = useState<AdminSection>("users");

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <Button
            key={item.id}
            variant={section === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div
        className={cn(
          "min-h-0 flex-1",
          section === "linkedin" ? "flex flex-col overflow-hidden" : "overflow-y-auto"
        )}
      >
        <div className={cn(section !== "users" && "hidden")}>
          <AdminUsersPanel />
        </div>
        <div className={cn(section !== "waitlist" && "hidden")}>
          <AdminWaitlistPanel />
        </div>
        <div className={cn(section !== "invites" && "hidden")}>
          <AdminInvitesPanel />
        </div>
        <div className={cn(section !== "audit" && "hidden")}>
          <AdminAuditPanel />
        </div>
        <div className={cn(section !== "emails" && "hidden")}>
          <AdminEmailTesterPanel />
        </div>
        {section === "linkedin" ? <AdminLinkedInPanel /> : null}
        <div className={cn(section !== "automations" && "hidden")}>
          <AdminAutomationsPanel />
        </div>
        <div className={cn(section !== "system" && "hidden")}>
          <AdminSystemPanel />
        </div>
        <div className={cn(section !== "agent" && "hidden", "space-y-8")}>
          <IntentPlayground />
          <KnowledgeDictionary />
        </div>
      </div>
    </div>
  );
}
