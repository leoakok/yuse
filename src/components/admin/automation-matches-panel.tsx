"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OffsetPagination } from "@/components/ui/offset-pagination";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { LinkedInJobDetail } from "@/components/admin/linkedin-job-detail";
import { banAutomationCompany, listAutomationMatches, setAutomationMatchFeedback } from "@/lib/api/admin-api";
import type { AutomationMatchFeedback, AutomationMatchedJob, LinkedInJobCard } from "@/lib/types/admin";
import {
  workspaceRowActionButtonClassName,
  workspaceRowActionsClassName,
  workspaceRowClassName,
  workspaceRowListClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

type FeedbackFilter = "ALL" | "LIKED" | "DISLIKED" | "UNRATED";

const FILTER_TABS: Array<{ value: FeedbackFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "LIKED", label: "Liked" },
  { value: "DISLIKED", label: "Not interested" },
  { value: "UNRATED", label: "Unrated" },
];

const MATCH_PAGE_SIZE = 20;

function toJobCard(match: AutomationMatchedJob): LinkedInJobCard {
  return {
    jobId: match.jobId,
    title: match.title,
    company: match.company,
    location: match.location,
    workplaceType: match.workplaceType,
    employmentType: match.employmentType,
    listedAt: match.listedAt,
    description: match.description,
    url: match.url,
  };
}

function formatWhen(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

type AutomationMatchesPanelProps = {
  automationId: string;
  refreshKey?: number;
  highlightJobIds?: string[];
  onBanCompany?: () => void;
  /** split: list beside detail (default). stack: list above detail for narrow sidebars. */
  layout?: "split" | "stack";
  /** Hide section title when embedded in a parent tab. */
  embedded?: boolean;
};

export function AutomationMatchesPanel({
  automationId,
  refreshKey = 0,
  highlightJobIds = [],
  onBanCompany,
  layout = "split",
  embedded = false,
}: AutomationMatchesPanelProps) {
  const [filter, setFilter] = useState<FeedbackFilter>("ALL");
  const [offset, setOffset] = useState(0);
  const [matches, setMatches] = useState<AutomationMatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [banOffer, setBanOffer] = useState<{ company: string; jobId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const feedback =
        filter === "ALL"
          ? null
          : filter === "UNRATED"
            ? ("NONE" as AutomationMatchFeedback)
            : (filter as AutomationMatchFeedback);
      const rows = await listAutomationMatches(automationId, {
        limit: MATCH_PAGE_SIZE,
        offset,
        feedback,
      });
      setMatches(rows);
      setSelectedJobId((current) => {
        if (current && rows.some((row) => row.jobId === current)) return current;
        return rows[0]?.jobId ?? null;
      });
    } catch {
      toast.error("Could not load matched jobs.");
    } finally {
      setLoading(false);
    }
  }, [automationId, filter, offset]);

  useEffect(() => {
    setOffset(0);
  }, [automationId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const selected = useMemo(
    () => matches.find((row) => row.jobId === selectedJobId) ?? null,
    [matches, selectedJobId],
  );

  const highlightSet = useMemo(() => new Set(highlightJobIds), [highlightJobIds]);

  async function handleFeedback(match: AutomationMatchedJob, feedback: AutomationMatchFeedback) {
    setBusyJobId(match.jobId);
    try {
      const updated = await setAutomationMatchFeedback(automationId, match.jobId, feedback);
      setMatches((current) => current.map((row) => (row.jobId === updated.jobId ? updated : row)));
      if (feedback === "DISLIKED" && match.company?.trim()) {
        setBanOffer({ company: match.company.trim(), jobId: match.jobId });
      }
    } catch {
      toast.error("Could not save feedback.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function confirmBanCompany() {
    if (!banOffer) return;
    try {
      await banAutomationCompany(banOffer.company, {
        jobId: banOffer.jobId,
        automationId,
      });
      toast.success(`${banOffer.company} banned from future matches.`);
      onBanCompany?.();
    } catch {
      toast.error("Could not ban company.");
    } finally {
      setBanOffer(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-1 border-b border-border/60 px-4 py-2.5 lg:px-5",
          embedded ? "justify-end" : "justify-between",
        )}
      >
        {!embedded ? <div className="mr-auto text-sm font-medium">Matched jobs</div> : null}
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setFilter(tab.value);
              setOffset(0);
            }}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">Loading matches…</p>
      ) : matches.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">
          No matched jobs yet. Run the automation or wait for the next scheduled run.
        </p>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            layout === "split" && "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden border-border/60",
              layout === "split" ? "max-h-80 border-b lg:max-h-none lg:border-b-0 lg:border-r" : "max-h-56 border-b",
            )}
          >
            <ul className={cn("min-h-0 flex-1 overflow-y-auto", workspaceRowListClassName)}>
              {matches.map((match) => {
                const isSelected = match.jobId === selectedJobId;
                const meta = [match.company, match.location].filter(Boolean).join(" · ");
                return (
                  <li key={match.jobId}>
                    <div
                      className={cn(
                        "flex items-start gap-2",
                        workspaceRowClassName,
                        isSelected && "bg-primary/5 hover:bg-primary/5",
                        highlightSet.has(match.jobId) && !isSelected && "bg-primary/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(match.jobId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="line-clamp-2 font-medium leading-snug">{match.title}</div>
                        {meta ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{meta}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Matched {formatWhen(match.firstMatchedAt)}
                        </div>
                      </button>
                      <div className={workspaceRowActionsClassName}>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className={cn("size-8", workspaceRowActionButtonClassName)}
                          disabled={busyJobId === match.jobId}
                          aria-label="Like match"
                          aria-pressed={match.feedback === "LIKED"}
                          onClick={() =>
                            void handleFeedback(
                              match,
                              match.feedback === "LIKED" ? "NONE" : "LIKED",
                            )
                          }
                        >
                          <ThumbsUp
                            className={cn(
                              "size-3.5",
                              match.feedback === "LIKED" && "text-primary",
                            )}
                          />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className={cn("size-8", workspaceRowActionButtonClassName)}
                          disabled={busyJobId === match.jobId}
                          aria-label="Not interested"
                          aria-pressed={match.feedback === "DISLIKED"}
                          onClick={() =>
                            void handleFeedback(
                              match,
                              match.feedback === "DISLIKED" ? "NONE" : "DISLIKED",
                            )
                          }
                        >
                          <ThumbsDown
                            className={cn(
                              "size-3.5",
                              match.feedback === "DISLIKED" && "text-destructive",
                            )}
                          />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <OffsetPagination
              offset={offset}
              pageSize={MATCH_PAGE_SIZE}
              itemCount={matches.length}
              onOffsetChange={setOffset}
              disabled={loading}
              className="shrink-0 border-t border-border/60 px-4 py-2 lg:px-5"
            />
          </div>

          <div className="flex min-h-0 min-h-48 flex-col overflow-hidden">
            {selected ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {selected.matchReason ? (
                  <div className="shrink-0 border-b border-border/60 px-4 py-2.5 text-sm lg:px-5">
                    <span className="text-xs text-muted-foreground">Why it matched</span>
                    <p className="mt-1">{selected.matchReason}</p>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <LinkedInJobDetail job={toJobCard(selected)} />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-4 py-6 text-sm text-muted-foreground lg:px-5">
                Select a match to view details.
              </div>
            )}
          </div>
        </div>
      )}

      <ResponsiveDialog open={banOffer != null} onOpenChange={(open) => !open && setBanOffer(null)}>
        <ResponsiveDialogContent dialogClassName="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Ban this company?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {banOffer
                ? `Stop matching and notifying jobs from "${banOffer.company}" across all automations?`
                : null}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => setBanOffer(null)}>
              Not now
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmBanCompany()}>
              <Ban className="mr-2 size-4" />
              Ban company
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
