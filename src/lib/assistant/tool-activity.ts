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
    return query
      ? `Let me search for "${truncate(query, 48)}"…`
      : "Let me search for that…";
  },
  fetch_url: () => "Let me read that page…",
  explore_website: () => "Let me explore that site…",
  crawl_site: () => "Let me explore that site…",
  crawl_github_profile: () => "Let me check your GitHub profile…",
  search_github: (p) => {
    if (p.listUserRepos === true) {
      const query = readString(p, "query");
      return query
        ? `Let me search your GitHub for "${truncate(query, 48)}"…`
        : "Let me look through your GitHub repos…";
    }
    const query = readString(p, "query");
    return query
      ? `Let me search GitHub for "${truncate(query, 48)}"…`
      : "Let me search GitHub…";
  },
  fetch_linkedin_profile: () => "Let me check your LinkedIn profile…",
  get_resume_content: () => "Let me read your CV…",
  get_resume: () => "Let me pull up that CV…",
  list_resumes: () => "Let me see what CVs you have…",
  list_sections: () => "Let me check your CV sections…",
  list_twin_entries: () => "Let me look at your Digital Twin…",
  get_twin_entry: () => "Let me pull up that twin entry…",
  list_cv_themes: () => "Let me load CV themes…",
  create_resume: (p) => {
    const title = readString(p, "title");
    return title
      ? `I'll create a CV called "${truncate(title, 40)}"…`
      : "I'll create a new CV for you…";
  },
  duplicate_resume: () => "Let me duplicate that CV…",
  delete_resume: () => "Let me delete that CV…",
  update_resume: () => "Let me update the CV title…",
  add_section_item: (p) => {
    const headline = readString(p, "headline");
    return headline
      ? `Let me add ${truncate(headline, 40)} to your CV…`
      : "Let me add something to your CV…";
  },
  update_section_item: () => "Let me update that CV entry…",
  set_item_visibility: () => "Let me update what's visible…",
  update_contact_profile: () => "Let me update your contact details…",
  update_resume_settings: () => "Let me tweak the CV design…",
  list_portfolios: () => "Let me see what portfolios you have…",
  get_portfolio_content: () => "Let me read your portfolio…",
  get_portfolio: () => "Let me pull up that portfolio…",
  create_portfolio: (p) => {
    const title = readString(p, "title");
    return title
      ? `I'll create a portfolio called "${truncate(title, 40)}"…`
      : "I'll create a new portfolio for you…";
  },
  duplicate_portfolio: () => "Let me duplicate that portfolio…",
  delete_portfolio: () => "Let me delete that portfolio…",
  update_portfolio: () => "Let me update your portfolio…",
  add_portfolio_project: (p) => {
    const title = readString(p, "title");
    return title
      ? `Let me add the project "${truncate(title, 40)}"…`
      : "Let me add a project…";
  },
  update_portfolio_project: () => "Let me update that project…",
  add_portfolio_skill: (p) => {
    const name = readString(p, "name");
    return name
      ? `Let me add ${truncate(name, 40)} as a skill…`
      : "Let me add a skill…";
  },
  update_portfolio_skill: () => "Let me update that skill…",
  add_portfolio_testimonial: () => "Let me add a testimonial…",
  update_portfolio_contact_profile: () => "Let me update your profile…",
  update_portfolio_settings: () => "Let me tweak the portfolio design…",
  create_twin_entry: (p) => {
    const title = readString(p, "title");
    return title
      ? `Let me save "${truncate(title, 40)}" to your Digital Twin…`
      : "Let me save that to your Digital Twin…";
  },
  update_twin_entry: () => "Let me update your Digital Twin…",
  delete_twin_entry: () => "Let me remove that twin entry…",
  list_tracked_jobs: () => "Let me check your tracked jobs…",
  get_tracked_job: () => "Let me pull up that job application…",
  update_tracked_job: () => "Let me save that job application…",
};

const TOOL_END_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  web_search: () => "Found some useful links",
  fetch_url: () => "Read that page",
  explore_website: () => "Finished exploring the site",
  crawl_site: () => "Finished exploring the site",
  crawl_github_profile: () => "Got your GitHub profile",
  search_github: (p) => {
    const summary = readString(p, "resultSummary");
    if (summary) return summary;
    if (p.listUserRepos === true && !readString(p, "query")) {
      return "Got your GitHub repos";
    }
    return "Finished searching GitHub";
  },
  fetch_linkedin_profile: () => "Got your LinkedIn profile",
  get_resume_content: () => "Read your CV",
  get_resume: () => "Pulled up that CV",
  list_resumes: () => "Checked your CVs",
  list_sections: () => "Checked your CV sections",
  list_twin_entries: () => "Looked at your Digital Twin",
  get_twin_entry: () => "Pulled up that twin entry",
  list_cv_themes: () => "Loaded CV themes",
  create_resume: (p) => {
    const title = readString(p, "title");
    return title ? `Created your CV "${truncate(title, 40)}"` : "Created your new CV";
  },
  duplicate_resume: () => "Duplicated that CV",
  delete_resume: () => "Deleted that CV",
  update_resume: () => "Updated the CV title",
  add_section_item: (p) => {
    const headline = readString(p, "headline");
    return headline ? `Added ${truncate(headline, 40)} to your CV` : "Added something to your CV";
  },
  update_section_item: () => "Updated that CV entry",
  set_item_visibility: (p) =>
    p.showInPreview === false ? "Hid that item" : "Made that item visible",
  update_contact_profile: () => "Updated your contact details",
  update_resume_settings: () => "Updated the CV design",
  list_portfolios: () => "Checked your portfolios",
  get_portfolio_content: () => "Read your portfolio",
  get_portfolio: () => "Pulled up that portfolio",
  create_portfolio: (p) => {
    const title = readString(p, "title");
    return title
      ? `Created your portfolio "${truncate(title, 40)}"`
      : "Created your new portfolio";
  },
  duplicate_portfolio: () => "Duplicated that portfolio",
  delete_portfolio: () => "Deleted that portfolio",
  update_portfolio: () => "Updated your portfolio",
  add_portfolio_project: (p) => {
    const title = readString(p, "title");
    return title ? `Added the project "${truncate(title, 40)}"` : "Added a project";
  },
  update_portfolio_project: () => "Updated that project",
  add_portfolio_skill: (p) => {
    const name = readString(p, "name");
    return name ? `Added ${truncate(name, 40)} as a skill` : "Added a skill";
  },
  update_portfolio_skill: () => "Updated that skill",
  add_portfolio_testimonial: () => "Added a testimonial",
  update_portfolio_contact_profile: () => "Updated your profile",
  update_portfolio_settings: () => "Updated the portfolio design",
  create_twin_entry: (p) => {
    const title = readString(p, "title");
    return title
      ? `Saved "${truncate(title, 40)}" to your Digital Twin`
      : "Saved to your Digital Twin";
  },
  update_twin_entry: () => "Updated your Digital Twin",
  delete_twin_entry: () => "Removed that twin entry",
  list_tracked_jobs: () => "Checked your tracked jobs",
  get_tracked_job: () => "Pulled up that job application",
  update_tracked_job: () => "Saved that job application",
};

/** @deprecated Use describeToolEnd for completed tool steps. */
const TOOL_LABELS = TOOL_END_LABELS;

export function describeToolStart(tool: string, args: Record<string, unknown> = {}): string {
  const label = TOOL_START_LABELS[tool];
  if (label) return label(args);
  return `Let me ${tool.replaceAll("_", " ")}…`;
}

export function describeToolEnd(
  tool: string,
  args: Record<string, unknown> = {},
  extras: { resultSummary?: string } = {}
): string {
  const payload = extras.resultSummary
    ? { ...args, resultSummary: extras.resultSummary }
    : args;
  const label = TOOL_END_LABELS[tool];
  if (label) return label(payload);
  return describeToolStart(tool, args).replace(/…$/, "");
}

const TOOL_ERROR_LABELS: Record<string, string> = {
  fetch_linkedin_profile: "Couldn't import LinkedIn — need a profile link",
  explore_website: "Couldn't explore that site",
  create_resume: "Couldn't create the CV",
  duplicate_resume: "Couldn't duplicate the CV",
  delete_resume: "Couldn't delete the CV",
  create_portfolio: "Couldn't create the portfolio",
  set_item_visibility: "Couldn't update what's shown on the CV",
  add_section_item: "Couldn't add that to your CV",
  update_contact_profile: "Couldn't update your contact details",
  create_twin_entry: "Couldn't save to your Digital Twin",
};

export function describeToolError(
  tool: string,
  error?: string,
  _args: Record<string, unknown> = {}
): string {
  const err = (error ?? "").trim().toLowerCase();
  if (
    err.includes("blocked") ||
    err.includes("too short") ||
    err.includes("unclear")
  ) {
    return "Paused — I need a clearer request first";
  }
  if (err.includes("profileurl") || err.includes("linkedin")) {
    return "LinkedIn import needs a profile link";
  }
  if (TOOL_ERROR_LABELS[tool]) {
    return TOOL_ERROR_LABELS[tool];
  }
  return "That step didn't work";
}

export function describeToolActivity(log: AssistantActionLog): string {
  const payload = log.payload ?? {};
  const summary = readString(payload, "resultSummary");
  if (summary) return summary;
  const label = TOOL_END_LABELS[log.op];
  if (label) return label(payload);
  return log.op.replaceAll("_", " ");
}
