"use client";

import {
  ClipboardCopy,
  Database,
  Shield,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { clearWorkspaceCacheForUser } from "@/lib/cache/workspace-cache";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuSeparator,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";
import { IconTooltip } from "@/components/ui/tooltip";
import {
  topbarIconSegmentClassName,
  topbarTrackClassName,
} from "@/lib/ui/topbar-nav";
import { cn } from "@/lib/utils";

export function DevToolsMenu() {
  const { user, workspace, bootstrapping } = useWorkspace();

  if (user.role !== "ADMIN") {
    return null;
  }

  async function handleCopyDebugInfo() {
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      workspace: workspace
        ? { id: workspace.id, slug: workspace.slug, plan: workspace.plan }
        : null,
      bootstrapping,
      path: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Session debug info copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function handleClearCache() {
    clearWorkspaceCacheForUser(user.id);
    toast.success("Workspace cache cleared for this session");
  }

  return (
    <div
      className={cn(topbarTrackClassName, "hidden md:flex")}
      aria-label="Developer tools"
    >
      <ResponsiveDropdownMenu>
        <IconTooltip label="Developer tools">
          <ResponsiveDropdownMenuTrigger
            render={
              <button
                type="button"
                className={topbarIconSegmentClassName()}
                aria-label="Developer tools"
              >
                <Wrench className="size-4" aria-hidden />
              </button>
            }
          />
        </IconTooltip>
        <ResponsiveDropdownMenuContent align="end" className="w-52">
          <ResponsiveDropdownMenuItem onClick={handleClearCache}>
            <Database className="size-4" />
            Clear workspace cache
          </ResponsiveDropdownMenuItem>
          <ResponsiveDropdownMenuItem onClick={() => void handleCopyDebugInfo()}>
            <ClipboardCopy className="size-4" />
            Copy session debug
          </ResponsiveDropdownMenuItem>
          <ResponsiveDropdownMenuSeparator />
          <ResponsiveDropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="size-4" />
            Admin console
          </ResponsiveDropdownMenuItem>
        </ResponsiveDropdownMenuContent>
      </ResponsiveDropdownMenu>
    </div>
  );
}
