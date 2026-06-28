export function resumePath(id: string) {
  return `/resumes/${id}`;
}

export function resumeCustomizePath(id: string) {
  return `/resumes/${id}/customize`;
}

export { resumePrintPath } from "@/lib/cv/print";

export function isResumePath(pathname: string) {
  return pathname === "/resumes" || pathname.startsWith("/resumes/");
}
