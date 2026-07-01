import { motionSkeleton } from "@/lib/ui/motion"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted", motionSkeleton, className)}
      {...props}
    />
  )
}

export { Skeleton }
