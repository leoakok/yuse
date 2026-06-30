"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { useWorkspace } from "@/components/layout/workspace-provider";

export function AdminWorkspace() {
  const { user } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (user.role === "ADMIN") return;
    router.replace("/home");
  }, [user.role, router]);

  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-8">
      <IntentPlayground />
      <KnowledgeDictionary />
    </div>
  );
}
