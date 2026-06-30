const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;

export const RESERVED_SLUGS = new Set([
  "home", "login", "logout", "register", "signup", "signin", "signout",
  "settings", "admin", "portfolios", "portfolio", "resumes", "resume",
  "print", "connections", "digital-twin", "job-tracker", "logo-preview",
  "assistant", "help", "support", "billing", "pricing", "about", "contact",
  "privacy", "terms", "legal", "security", "status", "docs", "blog",
  "api", "graphql", "playground", "healthz", "health", "healthcheck",
  "public", "static", "assets", "cdn", "media", "upload", "uploads",
  "download", "downloads", "files", "images", "img", "css", "js",
  "webhook", "webhooks", "callback", "callbacks", "oauth", "auth",
  "sso", "mfa", "verify", "confirm", "reset", "password",
  "administrator", "root", "system", "sysadmin", "superuser", "moderator", "mod",
  "staff", "team", "internal", "null", "undefined", "true", "false",
  "www", "mail", "email", "ftp", "smtp", "imap", "dns", "ssl",
  "dev", "staging", "prod", "production", "test", "demo", "sandbox",
  "app", "apps", "dashboard", "account", "accounts", "profile", "profiles",
  "user", "users", "workspace", "workspaces", "org", "orgs", "organization",
  "search", "explore", "feed", "notifications", "inbox", "messages", "chat",
  "share", "invite", "join", "create", "new", "edit", "delete", "remove",
  "yuse", "google", "github", "linkedin", "facebook", "twitter", "instagram",
  "abuse", "spam", "scam", "phishing", "porn", "xxx", "sex", "nazi",
]);

export function normalizeSlug(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  let out = "";
  let lastHyphen = false;
  for (const char of lowered) {
    if (/[a-z0-9]/.test(char)) {
      out += char;
      lastHyphen = false;
      continue;
    }
    if (char === "-") {
      if (out.length > 0 && !lastHyphen) {
        out += "-";
        lastHyphen = true;
      }
      continue;
    }
    if (char === " " || char === "_" || char === "." || char === "/") {
      if (out.length > 0 && !lastHyphen) {
        out += "-";
        lastHyphen = true;
      }
    }
    if (/[^\x00-\x7F]/.test(char) && /\p{L}/u.test(char)) {
      out += char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      lastHyphen = false;
    }
  }
  out = out.replace(/^-+|-+$/g, "");
  if (out.length > MAX_LENGTH) {
    out = out.slice(0, MAX_LENGTH).replace(/-+$/g, "");
  }
  return out;
}

export function validateSlug(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = normalizeSlug(raw);
  if (!value) {
    return { ok: false, message: "Enter a URL name using letters, numbers, or hyphens." };
  }
  if (value.length < MIN_LENGTH) {
    return { ok: false, message: `URL name must be at least ${MIN_LENGTH} characters.` };
  }
  if (value.length > MAX_LENGTH) {
    return { ok: false, message: `URL name must be at most ${MAX_LENGTH} characters.` };
  }
  if (!SLUG_PATTERN.test(value)) {
    return {
      ok: false,
      message: "URL name must start and end with a letter or number, and use only lowercase letters, numbers, and hyphens.",
    };
  }
  if (RESERVED_SLUGS.has(value) || value.startsWith("api-") || value.startsWith("admin-")) {
    return { ok: false, message: "That URL name is reserved, choose another." };
  }
  return { ok: true, value };
}

export function slugFromTitle(title: string): string {
  return normalizeSlug(title);
}

export function isPublicPortfolioPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return false;
  if (parts.some((part) => !validateSlug(part).ok)) return false;
  return true;
}
