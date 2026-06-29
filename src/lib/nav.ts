export type EnabledNavItem = {
  id: "resumes" | "job-tracker" | "portfolios";
  label: string;
  href: string;
  enabled: true;
};

export type NavItem = EnabledNavItem;

export const PRIMARY_NAV: NavItem[] = [
  { id: "resumes", label: "Resumes", href: "/resumes", enabled: true },
  { id: "job-tracker", label: "Job Tracker", href: "/job-tracker", enabled: true },
  { id: "portfolios", label: "Portfolios", href: "/portfolios", enabled: true },
];

export function isResumesNavActive(pathname: string) {
  return pathname === "/resumes" || pathname.startsWith("/resumes/");
}

export function isJobTrackerNavActive(pathname: string) {
  return pathname === "/job-tracker" || pathname.startsWith("/job-tracker/");
}

export function isPortfoliosNavActive(pathname: string) {
  return pathname === "/portfolios" || pathname.startsWith("/portfolios/");
}
