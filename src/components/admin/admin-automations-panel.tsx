"use client";

import { useCallback, useEffect, useState } from "react";
import { Cookie, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  clearLinkedInSession,
  createJobAutomation,
  deleteJobAutomation,
  linkedInSessionStatus,
  listAutomationRuns,
  listJobAutomations,
  runJobAutomationNow,
  saveLinkedInSession,
  updateJobAutomation,
} from "@/lib/api/admin-api";
import type {
  AutomationRun,
  JobAutomation,
  LinkedInEmploymentType,
  LinkedInExperienceLevel,
  LinkedInJobSortBy,
  LinkedInSessionStatus,
  LinkedInWorkplaceType,
} from "@/lib/types/admin";

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

const MORE_FILTERS = [{ value: "EASY_APPLY", label: "Easy Apply", description: "LinkedIn Easy Apply only" }] as const;

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
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [cookieDraft, setCookieDraft] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setRuns([]);
      return;
    }
    void listAutomationRuns(selectedId, 10)
      .then(setRuns)
      .catch(() => setRuns([]));
  }, [selectedId, automations]);

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
    try {
      const result = await runJobAutomationNow(row.id);
      toast.success(`Run finished: ${result.run.jobsMatched} matches, ${result.run.jobsEmailed} emailed.`);
      const history = await listAutomationRuns(row.id, 10);
      setRuns(history);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Job search automations</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Save LinkedIn search criteria once. Yuse fetches new jobs on a schedule, filters them with
            your criteria, and emails matches. Your LinkedIn cookie is encrypted and never shown again
            after saving.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCookieDialogOpen(true)}>
            <Cookie className="mr-2 size-4" />
            {session?.configured ? "Update session" : "Save LinkedIn session"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            New automation
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
        {session?.configured ? (
          <span>
            LinkedIn session configured
            {session.updatedAt ? ` · updated ${formatWhen(session.updatedAt)}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">No LinkedIn session saved yet.</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading automations…</p>
      ) : automations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No automations yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-2">
            {automations.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedId === row.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Every {row.intervalMinutes} min · last run {formatWhen(row.lastRunAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {!row.enabled ? <Badge variant="secondary">Paused</Badge> : null}
                    {row.sessionInvalid ? <Badge variant="destructive">Session expired</Badge> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="space-y-4 rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{selected.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === selected.id}
                    onClick={() => void handleRunNow(selected)}
                  >
                    <Play className="mr-2 size-4" />
                    Run now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === selected.id}
                    onClick={() => void handleDelete(selected)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === selected.id}
                  onClick={() => void toggleEnabled(selected)}
                >
                  {selected.enabled ? "Pause" : "Enable"}
                </Button>
                <span>{selected.enabled ? "Runs on schedule" : "Paused"}</span>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Keywords</dt>
                  <dd>{selected.keywords || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{selected.geoLabel || selected.geoId || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Notifications</dt>
                  <dd>Your account email</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Next run</dt>
                  <dd>{formatWhen(selected.nextRunAt)}</dd>
                </div>
              </dl>

              <div>
                <div className="mb-2 text-sm font-medium">Match criteria</div>
                <p className="rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selected.matchCriteria}</p>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Recent runs</div>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {runs.map((run) => (
                      <div key={run.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>{formatWhen(run.startedAt)}</span>
                          <Badge variant={run.status === "SUCCESS" ? "default" : "secondary"}>{run.status}</Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          Fetched {run.jobsFetched} · matched {run.jobsMatched} · emailed {run.jobsEmailed}
                        </div>
                        {run.error ? <div className="mt-1 text-destructive">{run.error}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

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
              placeholder='Match criteria — e.g. "Senior backend roles in Go, no agencies"'
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
            <ResponsiveDialogTitle>Save LinkedIn session</ResponsiveDialogTitle>
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
