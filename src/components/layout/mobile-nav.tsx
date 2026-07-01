"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLinks } from "@/components/layout/app-nav";
import { UserMenuButton } from "@/components/layout/user-menu-button";
import { Button } from "@/components/ui/button";
import { floatingChipSurfaceClassName } from "@/lib/ui/floating-chip";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          floatingChipSurfaceClassName,
          "size-8 shrink-0 rounded-full p-0 md:hidden"
        )}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <NavLinks orientation="vertical" onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t p-4">
              <UserMenuButton className="w-full justify-start" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
