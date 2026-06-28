import { ExternalLink } from "lucide-react";

export function JobLinkButton({ url }: { url: string }) {
  return (
    <a
      href={url}
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
