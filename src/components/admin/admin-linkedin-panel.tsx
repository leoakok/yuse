"use client";

import { useEffect, useMemo, useState } from "react";
import { Cookie, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { adminLinkedInJobSearch } from "@/lib/api/admin-api";
import { LinkedInGeoPicker } from "@/components/admin/linkedin-geo-picker";
import { LinkedInTimeFilter } from "@/components/admin/linkedin-time-filter";
import { LinkedInFilterDropdown } from "@/components/admin/linkedin-filter-dropdown";
import { LinkedInSortDropdown } from "@/components/admin/linkedin-sort-dropdown";
import { LinkedInJobDetail } from "@/components/admin/linkedin-job-detail";
import { LinkedInJobList } from "@/components/admin/linkedin-job-list";
import type {
  LinkedInEmploymentType,
  LinkedInExperienceLevel,
  LinkedInJobCard,
  LinkedInJobSortBy,
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

const EMPLOYMENT_FILTERS: Array<{ value: LinkedInEmploymentType; label: string; description?: string }> = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "OTHER", label: "Other" },
];

const MORE_FILTERS = [{ value: "EASY_APPLY", label: "Easy Apply", description: "LinkedIn Easy Apply only" }] as const;

function normalizeSessionCookie(raw: string): string {
  return raw.replace(/[\r\n\t]+/g, "").trim();
}

export function AdminLinkedInPanel() {
  const [sessionCookie, setSessionCookie] = useState("");
  const [cookieDraft, setCookieDraft] = useState("");
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [geo, setGeo] = useState<{ geoId: string; label: string } | null>(null);
  const [timeFilter, setTimeFilter] = useState("r86400");
  const [sortBy, setSortBy] = useState<LinkedInJobSortBy>("DATE_DESC");
  const [workplaceTypes, setWorkplaceTypes] = useState<LinkedInWorkplaceType[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<LinkedInExperienceLevel[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<LinkedInEmploymentType[]>([]);
  const [easyApply, setEasyApply] = useState(false);
  const [results, setResults] = useState<LinkedInJobCard[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCookie = normalizeSessionCookie(sessionCookie);
  const cookieIsSet = normalizedCookie.length > 0;

  useEffect(() => {
    return () => {
      setSessionCookie("");
      setKeywords("");
      setGeo(null);
      setResults([]);
      setError(null);
    };
  }, []);

  const selectedJob = useMemo(
    () => results.find((job) => job.jobId === selectedJobId) ?? null,
    [results, selectedJobId]
  );

  useEffect(() => {
    setSelectedJobId(results[0]?.jobId ?? null);
  }, [results]);

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
    if (geo?.geoId) return true;
    if (workplaceTypes.length > 0 || experienceLevels.length > 0 || employmentTypes.length > 0 || easyApply) {
      return true;
    }
    return false;
  }

  async function handleSearch(overrides?: { sortBy?: LinkedInJobSortBy }) {
    if (!hasSearchCriteria()) {
      toast.error("Add keywords, a location, or at least one filter.");
      return;
    }

    const nextSortBy = overrides?.sortBy ?? sortBy;

    setSearching(true);
    setError(null);
    try {
      const jobs = await adminLinkedInJobSearch({
        keywords: keywords.trim() || undefined,
        geoId: geo?.geoId,
        timeFilter,
        sortBy: nextSortBy,
        workplaceTypes: workplaceTypes.length > 0 ? workplaceTypes : undefined,
        experienceLevels: experienceLevels.length > 0 ? experienceLevels : undefined,
        employmentTypes: employmentTypes.length > 0 ? employmentTypes : undefined,
        easyApply: easyApply || undefined,
        sessionCookie: normalizedCookie || undefined,
      });
      setSortBy(nextSortBy);
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

  return (
    <div className="flex h-full min-h-[60vh] flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Input
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="Keywords (optional)"
          className="h-8 w-44 text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSearch();
          }}
        />
        <LinkedInGeoPicker value={geo} onChange={setGeo} />
        <LinkedInTimeFilter value={timeFilter} onChange={setTimeFilter} />
        <LinkedInFilterDropdown
          label="Workplace"
          options={WORKPLACE_FILTERS}
          selected={workplaceTypes}
          onChange={setWorkplaceTypes}
        />
        <LinkedInFilterDropdown
          label="Experience"
          options={EXPERIENCE_FILTERS}
          selected={experienceLevels}
          onChange={setExperienceLevels}
        />
        <LinkedInFilterDropdown
          label="Job type"
          options={EMPLOYMENT_FILTERS}
          selected={employmentTypes}
          onChange={setEmploymentTypes}
        />
        <LinkedInFilterDropdown
          label="More"
          options={[...MORE_FILTERS]}
          selected={easyApply ? ["EASY_APPLY"] : []}
          onChange={(values) => setEasyApply(values.includes("EASY_APPLY"))}
        />

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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {results.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {results.length} result{results.length === 1 ? "" : "s"}
                {searching ? " (loading more pages...)" : null}
              </span>
              <LinkedInSortDropdown
                value={sortBy}
                disabled={searching}
                onChange={(next) => void handleSearch({ sortBy: next })}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="flex min-h-0 max-h-72 flex-col overflow-hidden rounded-md border border-border/60 lg:max-h-none">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <LinkedInJobList
                    jobs={results}
                    selectedJobId={selectedJobId}
                    onSelect={setSelectedJobId}
                  />
                </div>
              </div>
              <div className="flex min-h-0 min-h-48 flex-1 flex-col overflow-hidden rounded-md border border-border/60">
                <LinkedInJobDetail job={selectedJob} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed border-border/60 py-16 text-sm text-muted-foreground">
            {searching ? "Searching LinkedIn (fetching multiple pages)..." : "Run a search to see job results here."}
          </div>
        )}
      </div>

      <ResponsiveDialog open={cookieDialogOpen} onOpenChange={setCookieDialogOpen}>
        <ResponsiveDialogContent dialogClassName="max-h-[90vh] sm:max-w-lg">
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
            className="field-sizing-fixed min-h-32 max-h-64 resize-none overflow-y-auto font-mono text-xs"
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
