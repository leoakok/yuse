import type { AgentPhase } from "@/lib/types/assistant";
import { cn } from "@/lib/utils";

interface AgentStatusBadgeProps {
  phase: AgentPhase;
  label: string;
  className?: string;
}

const phaseStyles: Record<AgentPhase, string> = {
  idle: "bg-muted text-muted-foreground",
  preparing: "bg-primary/10 text-primary",
  sending: "bg-primary/10 text-primary",
  thinking: "bg-primary/10 text-primary",
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  error: "bg-destructive/10 text-destructive",
};

export function AgentStatusBadge({ phase, label, className }: AgentStatusBadgeProps) {
  const isActive = ["preparing", "sending", "thinking"].includes(phase);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
        phaseStyles[phase],
        className
      )}
    >
      {isActive ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      ) : null}
      {label}
    </span>
  );
}
