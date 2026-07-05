import { ExternalLink } from "lucide-react";

import { sanitizeExternalUrl } from "@/lib/security/safe-url";

export function JobLinkButton({ url }: { url: string }) {
  const safeUrl = sanitizeExternalUrl(url);
  if (!safeUrl) {
    return null;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      onClick={(event) => event.stopPropagation()}
    >
      Open
      <ExternalLink className="size-3" />
    </a>
  );
}
