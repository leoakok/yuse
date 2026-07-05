"use client";

import { useState } from "react";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminWaitlistPanel } from "@/components/admin/admin-waitlist-panel";
import { AdminAuditPanel } from "@/components/admin/admin-audit-panel";
import { AdminSystemPanel } from "@/components/admin/admin-system-panel";
import { AdminEmailTesterPanel } from "@/components/admin/admin-email-tester-panel";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AdminSection } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: "users", label: "Users" },
  { id: "waitlist", label: "Waitlist" },
  { id: "audit", label: "Audit log" },
  { id: "emails", label: "Email tester" },
  { id: "agent", label: "Agent tools" },
  { id: "system", label: "System" },
];

export function AdminWorkspace() {
  const { user } = useWorkspace();
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>("users");

  useEffect(() => {
    if (user.role === "ADMIN") return;
    router.replace("/home");
  }, [user.role, router]);

  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
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

      <div className={cn(section !== "users" && "hidden")}>
        <AdminUsersPanel />
      </div>
      <div className={cn(section !== "waitlist" && "hidden")}>
        <AdminWaitlistPanel />
      </div>
      <div className={cn(section !== "audit" && "hidden")}>
        <AdminAuditPanel />
      </div>
      <div className={cn(section !== "emails" && "hidden")}>
        <AdminEmailTesterPanel />
      </div>
      <div className={cn(section !== "system" && "hidden")}>
        <AdminSystemPanel />
      </div>
      <div className={cn(section !== "agent" && "hidden", "space-y-8")}>
        <IntentPlayground />
        <KnowledgeDictionary />
      </div>
    </div>
  );
}
