"use client";

import { Menu } from "lucide-react";
import { useWorkspaceMobileDrawer } from "@/components/layout/workspace-mobile-drawer";
import { Button } from "@/components/ui/button";
import { topbarIconSegmentClassName, topbarTrackClassName } from "@/lib/ui/topbar-nav";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  showAccount?: boolean;
}

export function MobileNav({ showAccount: _showAccount = true }: MobileNavProps) {
  const { toggleDrawer, isDrawerOpen } = useWorkspaceMobileDrawer();
  const navOpen = isDrawerOpen("nav");
  const label = navOpen ? "Close menu" : "Open menu";

  return (
    <div className={cn(topbarTrackClassName, "md:hidden")}>
      <Button
        type="button"
        variant="ghost"
        className={topbarIconSegmentClassName(
          "border-transparent bg-transparent shadow-none",
        )}
        aria-label={label}
        tooltip={label}
        aria-pressed={navOpen}
        onClick={() => toggleDrawer("nav")}
      >
        <Menu />
      </Button>
    </div>
  );
}
