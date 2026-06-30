import { YuseLogo } from "@/components/brand/yuse-logo";
import { cn } from "@/lib/utils";

interface YusePresenceProps {
  message: string;
  detail?: string;
  className?: string;
}

/** Yuse as a person: mascot + first-person copy. */
export function YusePresence({ message, detail, className }: YusePresenceProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 scale-110 rounded-full bg-primary/10 blur-2xl"
          aria-hidden
        />
        <YuseLogo className="size-24 sm:size-28" aria-label="Yuse" />
      </div>
      <p className="mt-8 max-w-sm text-pretty text-lg font-medium leading-snug tracking-tight text-foreground">
        {message}
      </p>
      {detail ? (
        <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
