/**
 * Resume preview visibility matches backend semantics:
 * - Sections default to visible unless explicitly hidden.
 * - Items default to hidden unless explicitly shown on the resume.
 */
export function isSectionShownInPreview(showInPreview: boolean | undefined | null): boolean {
  return showInPreview !== false;
}

export function isItemShownInPreview(showInPreview: boolean | undefined | null): boolean {
  return showInPreview === true;
}
