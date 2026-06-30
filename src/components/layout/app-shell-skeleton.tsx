import { Skeleton } from "@/components/ui/skeleton";
import { PRIMARY_NAV } from "@/lib/nav";

const NAV_SKELETON_WIDTHS = ["w-[4.5rem]", "w-[5.5rem]", "w-[5.25rem]"] as const;

function CatalogCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div
      className="flex min-h-dvh flex-col bg-background"
      role="status"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-sm" />
          <Skeleton className="h-5 w-10" />
        </div>
        <nav
          className="flex items-center justify-center gap-1"
          aria-hidden="true"
        >
          {PRIMARY_NAV.map((item, index) => (
            <Skeleton
              key={item.id}
              className={`h-8 rounded-md ${NAV_SKELETON_WIDTHS[index] ?? "w-16"}`}
            />
          ))}
        </nav>
        <div className="flex items-center justify-end">
          <Skeleton className="size-8 rounded-full" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <CatalogCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </main>

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50"
        aria-hidden="true"
      >
        <Skeleton className="size-12 rounded-full shadow-lg" />
      </div>

      <span className="sr-only">Loading workspace…</span>
    </div>
  );
}
