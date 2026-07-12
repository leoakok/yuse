import type { LinkedInJobCard } from "@/lib/types/admin";
import { LinkedInRelativeListedAt } from "@/components/admin/linkedin-relative-listed-at";
import { cn } from "@/lib/utils";

interface LinkedInJobListProps {
  jobs: LinkedInJobCard[];
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
}

function jobMeta(job: LinkedInJobCard): string {
  return [job.company, job.location, job.workplaceType].filter(Boolean).join(" · ");
}

export function LinkedInJobList({ jobs, selectedJobId, onSelect }: LinkedInJobListProps) {
  return (
    <ul className="divide-y divide-border/60">
      {jobs.map((job) => {
        const isSelected = job.jobId === selectedJobId;
        const meta = jobMeta(job);

        return (
          <li key={job.jobId}>
            <button
              type="button"
              onClick={() => onSelect(job.jobId)}
              className={cn(
                "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40",
                isSelected && "bg-muted/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-medium leading-snug">{job.title}</span>
                <LinkedInRelativeListedAt
                  value={job.listedAt}
                  className="shrink-0 text-xs text-muted-foreground"
                />
              </div>
              {meta ? (
                <span className="line-clamp-1 text-xs text-muted-foreground">{meta}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
