import type { AssistantActionLog } from "@/lib/types/assistant";

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const TOOL_START_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  web_search: (p) => {
    const query = readString(p, "query");
    return query ? `Searching the web for "${truncate(query, 48)}"` : "Searching the web";
  },
  fetch_url: (p) => {
    const url = readString(p, "url");
    return url ? `Reading ${truncate(url, 56)}` : "Reading a web page";
  },
  explore_website: (p) => {
    const url = readString(p, "url");
    return url ? `Exploring ${truncate(url, 56)}` : "Exploring website";
  },
  crawl_site: (p) => {
    const url = readString(p, "url");
    return url ? `Exploring ${truncate(url, 56)}` : "Exploring website";
  },
  crawl_github_profile: (p) => {
    const url = readString(p, "url");
    return url ? `Crawling GitHub profile ${truncate(url, 48)}` : "Crawling GitHub profile";
  },
  search_github: (p) => {
    if (p.listUserRepos === true) {
      const query = readString(p, "query");
      return query
        ? `Searching your GitHub repos for "${truncate(query, 48)}"`
        : "Listing your GitHub repos";
    }
    const query = readString(p, "query");
    return query ? `Searching GitHub for "${truncate(query, 48)}"` : "Searching GitHub";
  },
  fetch_linkedin_profile: (p) => {
    const url = readString(p, "profileUrl") ?? readString(p, "profile_url") ?? readString(p, "url");
    return url ? `Reading LinkedIn profile ${truncate(url, 56)}` : "Reading LinkedIn profile";
  },
  get_resume_content: () => "Reading your resume",
  get_resume: () => "Looking up resume details",
  list_resumes: () => "Listing your resumes",
  list_sections: () => "Listing resume sections",
  list_twin_entries: () => "Reading your Digital Twin",
  get_twin_entry: () => "Reading a twin entry",
  list_cv_themes: () => "Loading CV themes",
  create_resume: (p) => {
    const title = readString(p, "title");
    return title ? `Creating resume "${truncate(title, 40)}"` : "Creating a new resume";
  },
  duplicate_resume: () => "Duplicating resume",
  delete_resume: () => "Deleting resume",
  update_resume: () => "Updating resume title",
  add_section_item: (p) => {
    const headline = readString(p, "headline");
    return headline ? `Adding ${truncate(headline, 40)}` : "Adding a section item";
  },
  update_section_item: () => "Updating a section item",
  set_item_visibility: () => "Updating visibility",
  update_contact_profile: () => "Updating your profile",
  update_resume_settings: () => "Updating resume design",
  create_twin_entry: (p) => {
    const title = readString(p, "title");
    return title ? `Saving to Digital Twin: ${truncate(title, 40)}` : "Saving to Digital Twin";
  },
  update_twin_entry: () => "Updating Digital Twin entry",
  delete_twin_entry: () => "Deleting twin entry",
  list_tracked_jobs: () => "Listing tracked jobs",
  get_tracked_job: () => "Reading job application",
  update_tracked_job: () => "Saving job application",
};

const TOOL_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  web_search: () => "Searched the web",
  fetch_url: () => "Read a web page",
  explore_website: () => "Explored website",
  crawl_site: () => "Explored website",
  crawl_github_profile: () => "Crawled GitHub profile",
  search_github: (p) => {
    const summary = readString(p, "resultSummary");
    if (summary) return summary;
    if (p.listUserRepos === true && !readString(p, "query")) {
      return "Listed your GitHub repos";
    }
    return "Searched GitHub";
  },
  fetch_linkedin_profile: () => "Read LinkedIn profile",
  add_section_item: (p) => {
    const headline = readString(p, "headline") ?? "item";
    return `Added ${headline} to a section`;
  },
  update_section_item: () => "Updated a section item",
  set_item_visibility: (p) =>
    p.showInPreview === false ? "Hid an item" : "Showed an item",
  update_contact_profile: (p) => {
    if (readString(p, "email")) return `Updated email to ${readString(p, "email")}`;
    return "Updated contact profile";
  },
  create_twin_entry: (p) => {
    const title = readString(p, "title") ?? "entry";
    return `Added twin entry: ${title}`;
  },
  update_twin_entry: () => "Updated a twin entry",
  delete_twin_entry: () => "Deleted a twin entry",
  update_tracked_job: () => "Saved job application",
  create_resume: (p) => {
    const title = readString(p, "title") ?? "resume";
    return `Created resume: ${title}`;
  },
  update_resume: () => "Updated resume",
  update_resume_settings: () => "Updated resume settings",
  get_resume_content: () => "Read resume content",
  list_sections: () => "Listed sections",
  list_resumes: () => "Listed resumes",
};

export function describeToolStart(tool: string, args: Record<string, unknown> = {}): string {
  const label = TOOL_START_LABELS[tool];
  if (label) return label(args);
  return tool.replaceAll("_", " ");
}

export function describeToolActivity(log: AssistantActionLog): string {
  const label = TOOL_LABELS[log.op];
  if (label) {
    return label(log.payload ?? {});
  }
  return log.op.replaceAll("_", " ");
}

export function successfulToolActivities(logs: AssistantActionLog[]): string[] {
  return logs
    .filter((log) => log.success && !log.op.startsWith("get_") && !log.op.startsWith("list_"))
    .map(describeToolActivity);
}
