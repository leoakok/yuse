/** Resume or portfolio editor routes (including customize), not catalog list pages. */
export function isDocumentWorkspacePath(pathname: string): boolean {
  return /^\/(resumes|portfolios)\/[^/]+/.test(pathname);
}
