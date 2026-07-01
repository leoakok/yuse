"use client";

import {
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORT_MAILTO } from "@/lib/support";
import {
  floatingChipNavLinkClassName,
  floatingChipSurfaceClassName,
} from "@/lib/ui/floating-chip";
import { motionTransitionColors } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface UserMenuButtonProps {
  variant?: "standalone" | "grouped";
  className?: string;
}

export function UserMenuButton({
  variant = "standalone",
  className,
}: UserMenuButtonProps) {
  const { user } = useWorkspace();
  const pathname = usePathname() ?? "";
  const settingsActive = pathname.startsWith("/settings");
  const connectionsActive = pathname.startsWith("/connections");
  const adminActive = pathname.startsWith("/admin");
  const isAdmin = user.role === "ADMIN";
  const isGrouped = variant === "grouped";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              !isGrouped && floatingChipSurfaceClassName,
              isGrouped
                ? cn(
                    floatingChipNavLinkClassName,
                    "gap-2 text-muted-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground aria-expanded:shadow-sm aria-expanded:hover:bg-accent/90"
                  )
                : "inline-flex h-8 min-h-8 items-center gap-2 rounded-full px-3 py-0 text-sm font-medium text-foreground hover:bg-muted/40 aria-expanded:border-primary/40 aria-expanded:bg-accent aria-expanded:text-accent-foreground aria-expanded:shadow-md aria-expanded:hover:bg-accent/90",
              motionTransitionColors,
              className
            )}
            aria-label={`Account menu for ${user.displayName}`}
          >
            <Avatar size="sm">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <span className="max-w-32 truncate font-medium">{user.displayName}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{user.displayName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem
            render={<Link href="/settings" />}
            className={cn(settingsActive && "bg-accent text-accent-foreground")}
          >
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/connections" />}
            className={cn(connectionsActive && "bg-accent text-accent-foreground")}
          >
            <Link2 />
            Connections
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem
              render={<Link href="/admin" />}
              className={cn(adminActive && "bg-accent text-accent-foreground")}
            >
              <Shield />
              Admin
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Platform</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/resumes" />}>
            <FileText />
            Resumes
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Help</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/settings#support" />}>
            <HelpCircle />
            Help &amp; support
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href={SUPPORT_MAILTO} />}>
            <Mail />
            Contact support
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
