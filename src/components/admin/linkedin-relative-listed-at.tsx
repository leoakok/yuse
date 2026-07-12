import {
  formatAbsoluteListedAt,
  formatRelativeListedAt,
} from "@/lib/admin/linkedin-listed-at";
import { cn } from "@/lib/utils";

interface LinkedInRelativeListedAtProps {
  value?: string | null;
  className?: string;
}

export function LinkedInRelativeListedAt({ value, className }: LinkedInRelativeListedAtProps) {
  const relative = formatRelativeListedAt(value);
  const absolute = formatAbsoluteListedAt(value);
  const title = absolute && relative !== absolute ? absolute : undefined;

  return (
    <span className={cn("whitespace-nowrap", className)} title={title}>
      {relative}
    </span>
  );
}
