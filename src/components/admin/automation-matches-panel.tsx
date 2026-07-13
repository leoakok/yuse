"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type FeedbackFilter = "ALL" | "LIKED" | "DISLIKED" | "UNRATED";

const FILTER_TABS: Array<{ value: FeedbackFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "LIKED", label: "Liked" },
  { value: "DISLIKED", label: "Not interested" },
  { value: "UNRATED", label: "Unrated" },
];

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
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

type AutomationMatchesPanelProps = {
  automationId: string;
  refreshKey?: number;
  highlightJobIds?: string[];
  onBanCompany?: () => void;
};

export function AutomationMatchesPanel({
  automationId,
  refreshKey = 0,
  highlightJobIds = [],
  onBanCompany,
}: AutomationMatchesPanelProps) {
  const [filter, setFilter] = useState<FeedbackFilter>("ALL");
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
      const rows = await listAutomationMatches(automationId, { limit: 100, feedback });
      setMatches(rows);
      setSelectedJobId((current) => current ?? rows[0]?.jobId ?? null);
    } catch {
      toast.error("Could not load matched jobs.");
    } finally {
      setLoading(false);
    }
  }, [automationId, filter]);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Matched jobs</div>
          <p className="text-xs text-muted-foreground">
            Saved matches from this automation. Rate them to improve future recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={filter === tab.value ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading matches…</p>
      ) : matches.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          No matched jobs yet. Run the automation or wait for the next scheduled run.
        </p>
      ) : (
        <div className="flex min-h-[280px] flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex min-h-0 max-h-80 flex-col overflow-hidden rounded-md border border-border/60 lg:max-h-[420px]">
            <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
              {matches.map((match) => {
                const isSelected = match.jobId === selectedJobId;
                const meta = [match.company, match.location].filter(Boolean).join(" · ");
                return (
                  <li
                    key={match.jobId}
                    className={cn(
                      highlightSet.has(match.jobId) && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex gap-2 px-3 py-2.5",
                        isSelected && "bg-muted/50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(match.jobId)}
                        className="min-w-0 flex-1 text-left text-sm"
                      >
                        <div className="line-clamp-2 font-medium leading-snug">{match.title}</div>
                        {meta ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{meta}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Matched {formatWhen(match.firstMatchedAt)}
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant={match.feedback === "LIKED" ? "default" : "outline"}
                          className="size-7"
                          disabled={busyJobId === match.jobId}
                          aria-label="Like match"
                          onClick={() =>
                            void handleFeedback(
                              match,
                              match.feedback === "LIKED" ? "NONE" : "LIKED",
                            )
                          }
                        >
                          <ThumbsUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant={match.feedback === "DISLIKED" ? "destructive" : "outline"}
                          className="size-7"
                          disabled={busyJobId === match.jobId}
                          aria-label="Not interested"
                          onClick={() =>
                            void handleFeedback(
                              match,
                              match.feedback === "DISLIKED" ? "NONE" : "DISLIKED",
                            )
                          }
                        >
                          <ThumbsDown className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex min-h-0 min-h-48 flex-col overflow-hidden rounded-md border border-border/60">
            {selected ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {selected.matchReason ? (
                  <div className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-2 text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Why it matched
                    </span>
                    <p className="mt-1">{selected.matchReason}</p>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <LinkedInJobDetail job={toJobCard(selected)} />
                </div>
                <div className="shrink-0 border-t border-border/60 px-4 py-2">
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Open on LinkedIn
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
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
