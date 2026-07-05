"use client";

import {
  ChevronDown,
  FileText,
  HelpCircle,
  Link2,
  LogOut,
  Mail,
  Settings,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuGroup,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuLabel,
  ResponsiveDropdownMenuSeparator,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";
import { SUPPORT_MAILTO } from "@/lib/support";
import { floatingChipNavLinkClassName } from "@/lib/ui/floating-chip";
import { motionTransitionColors } from "@/lib/ui/motion";
import { topbarSegmentClassName } from "@/lib/ui/topbar-nav";
import { cn } from "@/lib/utils";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface UserMenuButtonProps {
  variant?: "topbar" | "grouped";
  className?: string;
}

export function UserMenuButton({
  variant = "topbar",
  className,
}: UserMenuButtonProps) {
  const { user } = useWorkspace();
  const pathname = usePathname() ?? "";
  const settingsActive = pathname.startsWith("/settings");
  const connectionsActive = pathname.startsWith("/connections");
  const adminActive = pathname.startsWith("/admin");
  const isAdmin = user.role === "ADMIN";
  const isGrouped = variant === "grouped";
  const accountSectionActive =
    settingsActive || connectionsActive || adminActive;

  return (
    <ResponsiveDropdownMenu>
      <ResponsiveDropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              isGrouped
                ? cn(
                    floatingChipNavLinkClassName,
                    "gap-2 text-muted-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground aria-expanded:shadow-sm aria-expanded:hover:bg-accent/90"
                  )
                : topbarSegmentClassName(
                    accountSectionActive,
                    "border-transparent bg-transparent pl-2 pr-2.5 shadow-none"
                  ),
              motionTransitionColors,
              className
            )}
            aria-label={`Account menu for ${user.displayName}`}
          >
            <Avatar size="sm">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <span className="max-w-28 truncate">{user.displayName}</span>
            <ChevronDown
              className="size-3.5 shrink-0 text-muted-foreground/80"
              aria-hidden
            />
          </Button>
        }
      />
      <ResponsiveDropdownMenuContent align="end" className="min-w-56">
        <ResponsiveDropdownMenuGroup>
          <ResponsiveDropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{user.displayName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </ResponsiveDropdownMenuLabel>
        </ResponsiveDropdownMenuGroup>
        <ResponsiveDropdownMenuSeparator />
        <ResponsiveDropdownMenuGroup>
          <ResponsiveDropdownMenuLabel>Account</ResponsiveDropdownMenuLabel>
          <ResponsiveDropdownMenuItem
            render={<Link href="/settings" />}
            className={cn(settingsActive && "bg-accent text-accent-foreground")}
          >
            <Settings />
            Settings
          </ResponsiveDropdownMenuItem>
          <ResponsiveDropdownMenuItem
            render={<Link href="/connections" />}
            className={cn(connectionsActive && "bg-accent text-accent-foreground")}
          >
            <Link2 />
            Connections
          </ResponsiveDropdownMenuItem>
          {isAdmin ? (
            <ResponsiveDropdownMenuItem
              render={<Link href="/admin" />}
              className={cn(adminActive && "bg-accent text-accent-foreground")}
            >
              <Shield />
              Admin
            </ResponsiveDropdownMenuItem>
          ) : null}
        </ResponsiveDropdownMenuGroup>
        <ResponsiveDropdownMenuSeparator />
        <ResponsiveDropdownMenuGroup>
          <ResponsiveDropdownMenuLabel>Platform</ResponsiveDropdownMenuLabel>
          <ResponsiveDropdownMenuItem render={<Link href="/resumes" />}>
            <FileText />
            Resumes
          </ResponsiveDropdownMenuItem>
        </ResponsiveDropdownMenuGroup>
        <ResponsiveDropdownMenuSeparator />
        <ResponsiveDropdownMenuGroup>
          <ResponsiveDropdownMenuLabel>Help</ResponsiveDropdownMenuLabel>
          <ResponsiveDropdownMenuItem render={<Link href="/settings#support" />}>
            <HelpCircle />
            Help &amp; support
          </ResponsiveDropdownMenuItem>
          <ResponsiveDropdownMenuItem render={<a href={SUPPORT_MAILTO} />}>
            <Mail />
            Contact support
          </ResponsiveDropdownMenuItem>
        </ResponsiveDropdownMenuGroup>
        <ResponsiveDropdownMenuSeparator />
        <ResponsiveDropdownMenuItem
          variant="destructive"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut />
          Sign out
        </ResponsiveDropdownMenuItem>
      </ResponsiveDropdownMenuContent>
    </ResponsiveDropdownMenu>
  );
}
