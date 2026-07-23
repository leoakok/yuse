import type { LinkedInJobCard } from "@/lib/types/admin";
import { LinkedInRelativeListedAt } from "@/components/admin/linkedin-relative-listed-at";
import { sanitizeExternalUrl } from "@/lib/security/safe-url";

interface LinkedInJobDetailProps {
  job: LinkedInJobCard | null;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

export function LinkedInJobDetail({ job }: LinkedInJobDetailProps) {
  if (!job) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6 text-sm text-muted-foreground">
        Select a job to view details.
      </div>
    );
  }

  const description = job.description?.trim() ?? "";
  const safeUrl = sanitizeExternalUrl(job.url);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold leading-snug">{job.title}</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Company" value={job.company} />
              <DetailField label="Location" value={job.location} />
              <DetailField label="Workplace" value={job.workplaceType} />
              <DetailField label="Employment type" value={job.employmentType} />
              <div className="text-sm">
                <dt className="text-xs text-muted-foreground">Posted</dt>
                <dd className="mt-0.5">
                  <LinkedInRelativeListedAt value={job.listedAt} />
                </dd>
              </div>
            </dl>
            {safeUrl ? (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-primary underline-offset-4 hover:underline"
              >
                Open on LinkedIn
              </a>
            ) : null}
          </div>

          {description ? (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
