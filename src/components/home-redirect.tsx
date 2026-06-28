"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveHomePath } from "@/lib/cv/home-path";
import { useWorkspace } from "@/components/layout/workspace-provider";

export function HomeRedirect() {
  const router = useRouter();
  const { user } = useWorkspace();

  useEffect(() => {
    let cancelled = false;
    void resolveHomePath(user.id).then((path) => {
      if (!cancelled) {
        router.replace(path);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, user.id]);

  return null;
}
