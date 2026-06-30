import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentLoadingProps {
  className?: string;
  label?: string;
}

export function ContentLoading({
  className,
  label = "Loading…",
}: ContentLoadingProps) {
  return (
    <div
      className={cn("flex flex-1 items-center justify-center", className)}
      role="status"
      aria-label={label}
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
