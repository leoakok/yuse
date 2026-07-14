"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Cookie,
  Heart,
  History,
  Info,
  MoreHorizontal,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LinkedInGeoPicker } from "@/components/admin/linkedin-geo-picker";
import { LinkedInTimeFilter } from "@/components/admin/linkedin-time-filter";
import { LinkedInFilterDropdown } from "@/components/admin/linkedin-filter-dropdown";
import { LinkedInSortDropdown } from "@/components/admin/linkedin-sort-dropdown";
import { AutomationMatchesPanel } from "@/components/admin/automation-matches-panel";
import { AutomationCompanyBansPanel } from "@/components/admin/automation-company-bans-panel";
import { AutomationLiveRunDialog } from "@/components/admin/automation-live-run-dialog";
import { AutomationRunHistoryPanel } from "@/components/admin/automation-run-history-panel";
import {
  ShellAside,
  WorkspacePanel,
  WorkspacePanelBody,
  WorkspacePanelHeader,
  WorkspacePanelScrollViewport,
} from "@/components/layout/workspace-panel";
import {
  ResizeHandle,
  useStoredWidth,
  clamp,
} from "@/components/layout/resize-handle";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  workspaceRowClassName,
  workspaceRowListClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

import {
  clearLinkedInSession,
  createJobAutomation,
  deleteJobAutomation,
  linkedInSessionStatus,
  listJobAutomations,
  saveLinkedInSession,
  updateJobAutomation,
} from "@/lib/api/admin-api";
import {
  streamAutomationRun,
  type AutomationRunStep,
} from "@/lib/api/automation-run-stream";
import type {
  JobAutomation,
  LinkedInEmploymentType,
  LinkedInExperienceLevel,
  LinkedInJobSortBy,
  LinkedInSessionStatus,
  LinkedInWorkplaceType,
} from "@/lib/types/admin";

const LIST_WIDTH_KEY = "admin-automations-list-width";
const LIST_WIDTH_DEFAULT = 260;
const LIST_WIDTH_MIN = 220;
const LIST_WIDTH_MAX = 360;

type DetailTab = "overview" | "matches" | "history" | "banned";

const DETAIL_VIEWS: Array<{
  id: DetailTab;
  label: string;
  icon: typeof History;
}> = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "matches", label: "Matches", icon: Heart },
  { id: "history", label: "Run history", icon: History },
  { id: "banned", label: "Banned companies", icon: Ban },
];

const WORKPLACE_FILTERS: Array<{ value: LinkedInWorkplaceType; label: string }> = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ON_SITE", label: "On-site" },
];

const EXPERIENCE_FILTERS: Array<{ value: LinkedInExperienceLevel; label: string }> = [
  { value: "INTERNSHIP", label: "Internship" },
  { value: "ENTRY", label: "Entry" },
  { value: "ASSOCIATE", label: "Associate" },
  { value: "MID_SENIOR", label: "Mid-senior" },
  { value: "DIRECTOR", label: "Director" },
  { value: "EXECUTIVE", label: "Executive" },
];

const EMPLOYMENT_FILTERS: Array<{ value: LinkedInEmploymentType; label: string }> = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "OTHER", label: "Other" },
];

const MORE_FILTERS = [{ value: "EASY_APPLY", label: "Easy Apply" }] as const;

const INTERVAL_OPTIONS = [
  { value: 60, label: "Every hour" },
  { value: 120, label: "Every 2 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 720, label: "Every 12 hours" },
  { value: 1440, label: "Every 24 hours" },
];

function normalizeSessionCookie(raw: string): string {
  return raw.replace(/[\r\n\t]+/g, "").trim();
}

function formatWhen(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function formatInterval(minutes: number): string {
  return INTERVAL_OPTIONS.find((option) => option.value === minutes)?.label ?? `Every ${minutes} min`;
}

type FormState = {
  name: string;
  keywords: string;
  geo: { geoId: string; label: string } | null;
  timeFilter: string;
  sortBy: LinkedInJobSortBy;
  workplaceTypes: LinkedInWorkplaceType[];
  experienceLevels: LinkedInExperienceLevel[];
  employmentTypes: LinkedInEmploymentType[];
  easyApply: boolean;
  matchCriteria: string;
  intervalMinutes: number;
};

const emptyForm = (): FormState => ({
  name: "",
  keywords: "",
  geo: null,
  timeFilter: "r86400",
  sortBy: "DATE_DESC",
  workplaceTypes: [],
  experienceLevels: [],
  employmentTypes: [],
  easyApply: false,
  matchCriteria: "",
  intervalMinutes: 60,
});

export function AdminAutomationsPanel() {
  const [automations, setAutomations] = useState<JobAutomation[]>([]);
  const [session, setSession] = useState<LinkedInSessionStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [cookieDraft, setCookieDraft] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [matchesRefreshKey, setMatchesRefreshKey] = useState(0);
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const [bansRefreshKey, setBansRefreshKey] = useState(0);
  const [newMatchJobIds, setNewMatchJobIds] = useState<string[]>([]);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [liveRunOpen, setLiveRunOpen] = useState(false);
  const [liveRunName, setLiveRunName] = useState("");
  const [liveRunSteps, setLiveRunSteps] = useState<AutomationRunStep[]>([]);
  const [liveRunError, setLiveRunError] = useState<string | null>(null);

  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [listWidth, setListWidth] = useStoredWidth(LIST_WIDTH_KEY, LIST_WIDTH_DEFAULT);

  const selected = automations.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, sessionStatus] = await Promise.all([listJobAutomations(), linkedInSessionStatus()]);
      setAutomations(rows);
      setSession(sessionStatus);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch {
      toast.error("Could not load automations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setMobileShowDetail(false);
    }
  }, [selectedId]);

  function selectAutomation(id: string) {
    setSelectedId(id);
    setDetailTab("overview");
    if (!isLargeScreen) {
      setMobileShowDetail(true);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: JobAutomation) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      keywords: row.keywords ?? "",
      geo: row.geoId ? { geoId: row.geoId, label: row.geoLabel ?? row.geoId } : null,
      timeFilter: row.timeFilter,
      sortBy: row.sortBy,
      workplaceTypes: row.workplaceTypes,
      experienceLevels: row.experienceLevels,
      employmentTypes: row.employmentTypes,
      easyApply: row.easyApply,
      matchCriteria: row.matchCriteria,
      intervalMinutes: row.intervalMinutes,
    });
    setDialogOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.matchCriteria.trim()) {
      toast.error("Match criteria is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        keywords: form.keywords.trim() || undefined,
        geoId: form.geo?.geoId,
        geoLabel: form.geo?.label,
        timeFilter: form.timeFilter,
        sortBy: form.sortBy,
        workplaceTypes: form.workplaceTypes.length ? form.workplaceTypes : undefined,
        experienceLevels: form.experienceLevels.length ? form.experienceLevels : undefined,
        employmentTypes: form.employmentTypes.length ? form.employmentTypes : undefined,
        easyApply: form.easyApply || undefined,
        matchCriteria: form.matchCriteria.trim(),
        intervalMinutes: form.intervalMinutes,
      };

      if (editingId) {
        const updated = await updateJobAutomation({ id: editingId, ...payload });
        setAutomations((current) => current.map((row) => (row.id === updated.id ? updated : row)));
        toast.success("Automation updated.");
      } else {
        const created = await createJobAutomation(payload);
        setAutomations((current) => [created, ...current]);
        setSelectedId(created.id);
        toast.success("Automation created.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save automation.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(row: JobAutomation) {
    setBusyId(row.id);
    try {
      const updated = await updateJobAutomation({ id: row.id, enabled: !row.enabled });
      setAutomations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      toast.error("Could not update automation.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: JobAutomation) {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setBusyId(row.id);
    try {
      await deleteJobAutomation(row.id);
      setAutomations((current) => current.filter((item) => item.id !== row.id));
      if (selectedId === row.id) {
        setSelectedId(null);
      }
      toast.success("Automation deleted.");
    } catch {
      toast.error("Could not delete automation.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRunNow(row: JobAutomation) {
    setBusyId(row.id);
    setLiveRunName(row.name);
    setLiveRunSteps([]);
    setLiveRunError(null);
    setLiveRunOpen(true);
    try {
      const result = await streamAutomationRun(row.id, {
        onStep: (step) => {
          setLiveRunSteps((current) => {
            const index = current.findIndex((entry) => entry.id === step.id);
            if (index === -1) return [...current, step];
            const next = [...current];
            next[index] = step;
            return next;
          });
        },
      });
      toast.success(
        `Run finished: ${result.run.jobsMatched} matches, ${result.run.jobsEmailed} emailed.`,
      );
      setNewMatchJobIds(result.matches.map((match) => match.jobId));
      setMatchesRefreshKey((value) => value + 1);
      setRunsRefreshKey((value) => value + 1);
      setDetailTab("matches");
      void load();
      setLiveRunOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Run failed.";
      setLiveRunError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveCookie() {
    const cookie = normalizeSessionCookie(cookieDraft);
    if (!cookie) {
      toast.error("Paste your LinkedIn cookie first.");
      return;
    }
    try {
      const status = await saveLinkedInSession(cookie);
      setSession(status);
      setCookieDialogOpen(false);
      setCookieDraft("");
      toast.success("LinkedIn session saved.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save session.");
    }
  }

  async function handleClearCookie() {
    try {
      const status = await clearLinkedInSession();
      setSession(status);
      setCookieDraft("");
      toast.message("LinkedIn session cleared.");
    } catch {
      toast.error("Could not clear session.");
    }
  }

  const automationList = (
    <ul className={workspaceRowListClassName}>
      {automations.map((row) => {
        const subtitle = row.geoLabel || formatInterval(row.intervalMinutes);
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => selectAutomation(row.id)}
              className={cn(
                "flex w-full items-start justify-between gap-2 text-left",
                workspaceRowClassName,
                selectedId === row.id && "bg-primary/5 hover:bg-primary/5",
              )}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{row.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
              </div>
              {!row.enabled || row.sessionInvalid ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!row.enabled ? <Badge variant="secondary">Paused</Badge> : null}
                  {row.sessionInvalid ? <Badge variant="destructive">Session</Badge> : null}
                </div>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const overviewContent = selected ? (
    <div className="space-y-4 px-4 py-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Schedule</dt>
          <dd>{formatInterval(selected.intervalMinutes)}</dd>
        </div>
        {selected.nextRunAt ? (
          <div>
            <dt className="text-muted-foreground">Next run</dt>
            <dd>{formatWhen(selected.nextRunAt)}</dd>
          </div>
        ) : null}
        {selected.lastRunAt ? (
          <div>
            <dt className="text-muted-foreground">Last run</dt>
            <dd>{formatWhen(selected.lastRunAt)}</dd>
          </div>
        ) : null}
        {selected.keywords ? (
          <div>
            <dt className="text-muted-foreground">Keywords</dt>
            <dd>{selected.keywords}</dd>
          </div>
        ) : null}
        {selected.geoLabel || selected.geoId ? (
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd>{selected.geoLabel || selected.geoId}</dd>
          </div>
        ) : null}
      </dl>
      <div>
        <div className="mb-2 text-sm font-medium">Match criteria</div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.matchCriteria}</p>
      </div>
    </div>
  ) : null;

  const detailContent = selected ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{selected.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatInterval(selected.intervalMinutes)}</span>
              {!selected.enabled ? <Badge variant="secondary">Paused</Badge> : null}
              {selected.sessionInvalid ? <Badge variant="destructive">Session expired</Badge> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              disabled={busyId === selected.id}
              onClick={() => void handleRunNow(selected)}
            >
              <Play className="mr-1.5 size-3.5" />
              Run now
            </Button>
            <div className="flex items-center">
              {DETAIL_VIEWS.map((view) => {
                const Icon = view.icon;
                const active = detailTab === view.id;
                return (
                  <Button
                    key={view.id}
                    variant={active ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    aria-label={view.label}
                    aria-pressed={active}
                    onClick={() => setDetailTab(view.id)}
                  >
                    <Icon className="size-4" />
                  </Button>
                );
              })}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" className="size-8" aria-label="More actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(selected)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  disabled={busyId === selected.id}
                  onClick={() => void toggleEnabled(selected)}
                >
                  {selected.enabled ? "Pause" : "Enable"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={busyId === selected.id}
                  onClick={() => void handleDelete(selected)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {detailTab === "overview" ? (
          <WorkspacePanelScrollViewport scrollFade="bottom">{overviewContent}</WorkspacePanelScrollViewport>
        ) : null}
        {detailTab === "matches" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AutomationMatchesPanel
              automationId={selected.id}
              refreshKey={matchesRefreshKey}
              highlightJobIds={newMatchJobIds}
              layout="split"
              embedded
              onBanCompany={() => setBansRefreshKey((value) => value + 1)}
            />
          </div>
        ) : null}
        {detailTab === "history" ? (
          <AutomationRunHistoryPanel
            automationId={selected.id}
            refreshKey={runsRefreshKey}
          />
        ) : null}
        {detailTab === "banned" ? (
          <WorkspacePanelScrollViewport scrollFade="bottom">
            <AutomationCompanyBansPanel refreshKey={bansRefreshKey} embedded />
          </WorkspacePanelScrollViewport>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {loading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Loading automations…</p>
      ) : automations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a scheduled LinkedIn search. Yuse will email you when jobs match your criteria.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCookieDialogOpen(true)}>
              <Cookie className="mr-2 size-4" />
              {session?.configured ? "Update session" : "Connect LinkedIn"}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              New automation
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {(!isLargeScreen && mobileShowDetail) ? null : (
            <>
              <ShellAside side="left" width={listWidth} compact={!isLargeScreen}>
                <WorkspacePanel>
                  <WorkspacePanelHeader
                    leading={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setCookieDialogOpen(true)}
                        aria-label={session?.configured ? "Update LinkedIn session" : "Connect LinkedIn"}
                      >
                        <Cookie className={cn("size-4", session?.configured && "text-primary")} />
                      </Button>
                    }
                    trailing={
                      <Button size="icon" className="size-8" onClick={openCreate} aria-label="New automation">
                        <Plus className="size-4" />
                      </Button>
                    }
                  />
                  <WorkspacePanelBody>
                    <WorkspacePanelScrollViewport viewportClassName="px-0" scrollFade="bottom">
                      {automationList}
                    </WorkspacePanelScrollViewport>
                  </WorkspacePanelBody>
                </WorkspacePanel>
              </ShellAside>

              {isLargeScreen ? (
                <ResizeHandle
                  label="Resize automation list"
                  className="hidden lg:block"
                  onResize={(delta) =>
                    setListWidth((width) => clamp(width + delta, LIST_WIDTH_MIN, LIST_WIDTH_MAX))
                  }
                />
              ) : null}
            </>
          )}

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
              !isLargeScreen && !mobileShowDetail && "hidden lg:flex",
            )}
          >
            {!isLargeScreen && mobileShowDetail ? (
              <WorkspacePanelHeader
                leading={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2"
                    onClick={() => setMobileShowDetail(false)}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                }
              />
            ) : null}

            {selected ? (
              <WorkspacePanel className="min-h-0 flex-1">{detailContent}</WorkspacePanel>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Select an automation.
              </div>
            )}
          </div>
        </div>
      )}

      <AutomationLiveRunDialog
        open={liveRunOpen}
        automationName={liveRunName}
        steps={liveRunSteps}
        error={liveRunError}
        onDismiss={
          busyId
            ? undefined
            : () => {
                setLiveRunOpen(false);
                setLiveRunError(null);
              }
        }
      />

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{editingId ? "Edit automation" : "New automation"}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Configure LinkedIn search filters and describe what roles you want in plain language.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Input
                value={form.keywords}
                onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                placeholder="Keywords (optional)"
                className="min-w-[10rem] flex-1"
              />
              <LinkedInGeoPicker
                value={form.geo}
                onChange={(geo) => setForm((current) => ({ ...current, geo }))}
              />
              <LinkedInTimeFilter
                value={form.timeFilter}
                onChange={(timeFilter) => setForm((current) => ({ ...current, timeFilter }))}
              />
              <LinkedInSortDropdown
                value={form.sortBy}
                onChange={(sortBy) => setForm((current) => ({ ...current, sortBy }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkedInFilterDropdown
                label="Workplace"
                options={WORKPLACE_FILTERS}
                selected={form.workplaceTypes}
                onChange={(workplaceTypes) => setForm((current) => ({ ...current, workplaceTypes }))}
              />
              <LinkedInFilterDropdown
                label="Experience"
                options={EXPERIENCE_FILTERS}
                selected={form.experienceLevels}
                onChange={(experienceLevels) => setForm((current) => ({ ...current, experienceLevels }))}
              />
              <LinkedInFilterDropdown
                label="Job type"
                options={EMPLOYMENT_FILTERS}
                selected={form.employmentTypes}
                onChange={(employmentTypes) => setForm((current) => ({ ...current, employmentTypes }))}
              />
              <LinkedInFilterDropdown
                label="More"
                options={[...MORE_FILTERS]}
                selected={form.easyApply ? ["EASY_APPLY"] : []}
                onChange={(values) =>
                  setForm((current) => ({ ...current, easyApply: values.includes("EASY_APPLY") }))
                }
              />
            </div>
            <Textarea
              value={form.matchCriteria}
              onChange={(event) => setForm((current) => ({ ...current, matchCriteria: event.target.value }))}
              placeholder='Match criteria, e.g. "Senior backend roles in Go, no agencies"'
              rows={4}
              required
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Interval</label>
              <Select
                value={String(form.intervalMinutes)}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, intervalMinutes: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create automation"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={cookieDialogOpen} onOpenChange={setCookieDialogOpen}>
        <ResponsiveDialogContent className="max-h-[85vh] sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>LinkedIn session</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Paste the Cookie header from a linkedin.com request in DevTools. It is encrypted at rest
              and never shown again in the UI.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <Textarea
            value={cookieDraft}
            onChange={(event) => setCookieDraft(event.target.value)}
            placeholder="li_at=…; JSESSIONID=…"
            className="min-h-[140px] max-h-[240px] resize-none font-mono text-xs"
          />
          <ResponsiveDialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => void handleClearCookie()}>
              Clear saved session
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCookieDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSaveCookie()}>
                Save session
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
