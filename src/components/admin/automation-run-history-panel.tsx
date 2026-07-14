"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { OffsetPagination } from "@/components/ui/offset-pagination";
import { listAutomationRuns } from "@/lib/api/admin-api";
import type { AutomationRun } from "@/lib/types/admin";
import {
  workspaceRowClassName,
  workspaceRowListClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function formatWhen(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

type AutomationRunHistoryPanelProps = {
  automationId: string;
  refreshKey?: number;
};

export function AutomationRunHistoryPanel({
  automationId,
  refreshKey = 0,
}: AutomationRunHistoryPanelProps) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOffset(0);
  }, [automationId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listAutomationRuns(automationId, PAGE_SIZE, offset)
      .then((rows) => {
        if (!cancelled) setRuns(rows);
      })
      .catch(() => {
        if (!cancelled) setRuns([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [automationId, offset, refreshKey]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {loading && runs.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">Loading runs…</p>
      ) : runs.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">No runs yet.</p>
      ) : (
        <ul className={cn("min-h-0 flex-1 overflow-y-auto", workspaceRowListClassName)}>
          {runs.map((run) => (
            <li key={run.id} className={workspaceRowClassName}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{formatWhen(run.startedAt)}</span>
                <Badge variant={run.status === "SUCCESS" ? "default" : "secondary"}>
                  {run.status}
                </Badge>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Fetched {run.jobsFetched} · matched {run.jobsMatched} · emailed {run.jobsEmailed}
              </div>
              {run.error ? <div className="mt-1 text-destructive">{run.error}</div> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="shrink-0 border-t border-border/60 px-4 py-2 lg:px-5">
        <OffsetPagination
          offset={offset}
          pageSize={PAGE_SIZE}
          itemCount={runs.length}
          onOffsetChange={setOffset}
          disabled={loading}
        />
      </div>
    </div>
  );
}
