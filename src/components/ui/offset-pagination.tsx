"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OffsetPaginationProps {
  offset: number;
  pageSize: number;
  /** Number of items returned for the current page. */
  itemCount: number;
  onOffsetChange: (offset: number) => void;
  disabled?: boolean;
  className?: string;
}

export function OffsetPagination({
  offset,
  pageSize,
  itemCount,
  onOffsetChange,
  disabled = false,
  className,
}: OffsetPaginationProps) {
  const page = Math.floor(offset / pageSize) + 1;
  const hasPrev = offset > 0;
  const hasNext = itemCount >= pageSize;

  if (!hasPrev && !hasNext) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        disabled={disabled || !hasPrev}
        onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        disabled={disabled || !hasNext}
        onClick={() => onOffsetChange(offset + pageSize)}
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
