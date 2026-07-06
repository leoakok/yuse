"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Cookie, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { adminLinkedInJobSearch } from "@/lib/api/admin-api";
import type {
  LinkedInEmploymentType,
  LinkedInExperienceLevel,
  LinkedInJobCard,
  LinkedInWorkplaceType,
} from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const TIME_FILTERS = [
  { value: "r86400", label: "Last 24h" },
  { value: "r604800", label: "Last week" },
  { value: "r2592000", label: "Last month" },
] as const;

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
];

function normalizeSessionCookie(raw: string): string {
  return raw.replace(/[\r\n\t]+/g, "").trim();
}

function formatListedAt(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

type FilterChipGroupProps<T extends string> = {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (values: T[]) => void;
};

function FilterChipGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: FilterChipGroupProps<T>) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="h-7 shrink-0 px-2.5 text-xs"
            onClick={() => onChange(toggleValue(selected, option.value))}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function AdminLinkedInPanel() {
  const [sessionCookie, setSessionCookie] = useState("");
  const [cookieDraft, setCookieDraft] = useState("");
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [geoId, setGeoId] = useState("");
  const [timeFilter, setTimeFilter] = useState("r86400");
  const [workplaceTypes, setWorkplaceTypes] = useState<LinkedInWorkplaceType[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<LinkedInExperienceLevel[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<LinkedInEmploymentType[]>([]);
  const [results, setResults] = useState<LinkedInJobCard[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCookie = normalizeSessionCookie(sessionCookie);
  const cookieIsSet = normalizedCookie.length > 0;

  useEffect(() => {
    return () => {
      setSessionCookie("");
      setKeywords("");
      setGeoId("");
      setResults([]);
      setError(null);
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageResults = useMemo(() => {
    const start = page * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [page, results]);

  function openCookieDialog() {
    setCookieDraft(sessionCookie);
    setCookieDialogOpen(true);
  }

  function saveCookies() {
    setSessionCookie(cookieDraft);
    setCookieDialogOpen(false);
    toast.message("Cookies saved for this tab.");
  }

  function clearCookies() {
    setSessionCookie("");
    setCookieDraft("");
    toast.message("Cookies cleared.");
  }

  function hasSearchCriteria(): boolean {
    if (keywords.trim()) return true;
    if (geoId.trim()) return true;
    if (workplaceTypes.length > 0 || experienceLevels.length > 0 || employmentTypes.length > 0) {
      return true;
    }
    return false;
  }

  async function handleSearch() {
    if (!hasSearchCriteria()) {
      toast.error("Add keywords, a geoId, or at least one filter.");
      return;
    }

    setSearching(true);
    setError(null);
    setPage(0);
    setExpanded({});
    try {
      const jobs = await adminLinkedInJobSearch({
        keywords: keywords.trim() || undefined,
        geoId: geoId.trim() || undefined,
        timeFilter,
        workplaceTypes: workplaceTypes.length > 0 ? workplaceTypes : undefined,
        experienceLevels: experienceLevels.length > 0 ? experienceLevels : undefined,
        employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
        sessionCookie: normalizedCookie || undefined,
      });
      setResults(jobs);
      if (jobs.length === 0) {
        toast.message("No jobs found.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      setError(message);
      setResults([]);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  }

  function toggleExpanded(jobId: string) {
    setExpanded((current) => ({ ...current, [jobId]: !current[jobId] }));
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Input
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="Keywords (optional)"
          className="h-8 w-44 text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSearch();
          }}
        />
        <Input
          value={geoId}
          onChange={(event) => setGeoId(event.target.value)}
          placeholder="geoId"
          className="h-8 w-28 font-mono text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSearch();
          }}
        />
        <Select value={timeFilter} onValueChange={(value) => value && setTimeFilter(value)}>
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={openCookieDialog}>
            <Cookie className="size-3.5" />
            Cookies
          </Button>
          {cookieIsSet ? (
            <>
              <span className="text-xs text-muted-foreground">
                Set ({normalizedCookie.length.toLocaleString()} chars)
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearCookies}>
                Clear
              </Button>
            </>
          ) : null}
        </div>

        <Button size="sm" className="h-8 gap-1.5" onClick={() => void handleSearch()} disabled={searching}>
          <Search className="size-3.5" />
          {searching ? "Searching..." : "Search"}
        </Button>

        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChipGroup
          label="Workplace"
          options={WORKPLACE_FILTERS}
          selected={workplaceTypes}
          onChange={setWorkplaceTypes}
        />
        <div className="w-px shrink-0 bg-border/60" />
        <FilterChipGroup
          label="Experience"
          options={EXPERIENCE_FILTERS}
          selected={experienceLevels}
          onChange={setExperienceLevels}
        />
        <div className="w-px shrink-0 bg-border/60" />
        <FilterChipGroup
          label="Job type"
          options={EMPLOYMENT_FILTERS}
          selected={employmentTypes}
          onChange={setEmploymentTypes}
        />
      </div>

      <div className="min-h-0 flex-1">
        {results.length > 0 ? (
          <div className="flex h-full flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <span>
                  Page {page + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-muted-foreground">
                    <th className="w-8 py-2 pl-3 pr-2" />
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Company</th>
                    <th className="py-2 pr-4 font-medium">Location</th>
                    <th className="py-2 pr-4 font-medium">Workplace</th>
                    <th className="py-2 pr-4 font-medium">Posted</th>
                    <th className="py-2 pr-3 font-medium">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {pageResults.map((job) => {
                    const isOpen = expanded[job.jobId] ?? false;
                    const description = job.description?.trim() ?? "";
                    return (
                      <Fragment key={job.jobId}>
                        <tr className="border-b border-border/60">
                          <td className="py-2 pl-3 pr-2 align-top">
                            {description ? (
                              <button
                                type="button"
                                aria-label={isOpen ? "Collapse description" : "Expand description"}
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => toggleExpanded(job.jobId)}
                              >
                                {isOpen ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="py-2 pr-4 align-top">{job.title}</td>
                          <td className="py-2 pr-4 align-top">{job.company ?? "-"}</td>
                          <td className="py-2 pr-4 align-top">{job.location ?? "-"}</td>
                          <td className="py-2 pr-4 align-top">{job.workplaceType ?? "-"}</td>
                          <td className="py-2 pr-4 align-top whitespace-nowrap">
                            {formatListedAt(job.listedAt)}
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Open
                            </a>
                          </td>
                        </tr>
                        {description ? (
                          <tr className="border-b border-border/40">
                            <td />
                            <td colSpan={6} className="py-2 pr-4 pl-3 text-muted-foreground">
                              <p className={cn(!isOpen && "line-clamp-2")}>{description}</p>
                              {!isOpen ? (
                                <button
                                  type="button"
                                  className="mt-1 text-xs text-primary hover:underline"
                                  onClick={() => toggleExpanded(job.jobId)}
                                >
                                  Show full description
                                </button>
                              ) : null}
                              {job.employmentType ? (
                                <p className="mt-2 text-xs">Type: {job.employmentType}</p>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 py-16 text-sm text-muted-foreground">
            {searching ? "Searching LinkedIn..." : "Run a search to see job results here."}
          </div>
        )}
      </div>

      <ResponsiveDialog open={cookieDialogOpen} onOpenChange={setCookieDialogOpen}>
        <ResponsiveDialogContent dialogClassName="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Session cookies</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Paste the full Cookie header from a linkedin.com voyager request. Cookies stay in memory
              for this tab only and are never saved.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <Textarea
            autoComplete="off"
            spellCheck={false}
            rows={6}
            value={cookieDraft}
            onChange={(event) => setCookieDraft(event.target.value)}
            placeholder="li_at=...; JSESSIONID=..."
            className="min-h-32 resize-none font-mono text-xs"
          />
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => setCookieDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveCookies}>
              Save cookies
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
