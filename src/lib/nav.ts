export type EnabledNavItem = {
  id: "resumes" | "digital-twin" | "job-tracker";
  label: string;
  href: string;
  enabled: true;
};

type DisabledNavItem = {
  id: "portfolios";
  label: string;
  enabled: false;
};

export type NavItem = EnabledNavItem | DisabledNavItem;

export const PRIMARY_NAV: NavItem[] = [
  { id: "resumes", label: "Resumes", href: "/resumes", enabled: true },
  { id: "digital-twin", label: "Digital Twin", href: "/digital-twin", enabled: true },
  { id: "job-tracker", label: "Job Tracker", href: "/job-tracker", enabled: true },
  { id: "portfolios", label: "Portfolios", enabled: false },
];

export function isResumesNavActive(pathname: string) {
  return pathname === "/resumes" || pathname.startsWith("/resumes/");
}

export function isDigitalTwinNavActive(pathname: string) {
  return pathname === "/digital-twin" || pathname.startsWith("/digital-twin/");
}

export function isJobTrackerNavActive(pathname: string) {
  return pathname === "/job-tracker" || pathname.startsWith("/job-tracker/");
}
