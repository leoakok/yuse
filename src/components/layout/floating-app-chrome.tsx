"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCvAssistantOptional } from "@/components/agent/cv-assistant-provider";
import { WELCOME_PATH } from "@/components/agent/cv-assistant-shell";
import { AppNav } from "@/components/layout/app-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  ASSISTANT_DEFAULT,
  ASSISTANT_KEY,
  useStoredWidth,
} from "@/components/layout/resize-handle";
import { motionChromeShift } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

interface FloatingAppChromeProps {
  actions?: ReactNode;
  showAccount?: boolean;
}

export function FloatingAppChrome({
  actions,
  showAccount = true,
}: FloatingAppChromeProps) {
  const pathname = usePathname() ?? "";
  const assistant = useCvAssistantOptional();
  const isAssistantOpen = assistant?.isOpen ?? false;
  const [assistantWidth] = useStoredWidth(ASSISTANT_KEY, ASSISTANT_DEFAULT);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (pathname === WELCOME_PATH) {
    return null;
  }

  const chromeRightInset = isAssistantOpen && isLargeScreen ? assistantWidth : 0;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-50", motionChromeShift)}
      style={{ right: chromeRightInset }}
    >
      <div className="pointer-events-auto absolute top-4 left-4 md:hidden">
        <MobileNav />
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-1/2 hidden -translate-x-1/2 md:block">
        <AppNav showAccount={showAccount} />
      </div>

      {actions ? (
        <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
