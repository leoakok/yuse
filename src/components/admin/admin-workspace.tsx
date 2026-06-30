"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IntentPlayground } from "@/components/admin/intent-playground";
import { KnowledgeDictionary } from "@/components/admin/knowledge-dictionary";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminWorkspace() {
  const { user, loading } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (loading || user.role === "ADMIN") return;
    router.replace("/home");
  }, [loading, user.role, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
