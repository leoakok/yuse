export type LinkedInJobSortBy = "DATE_DESC" | "RELEVANCE";

export const LINKEDIN_SORT_OPTIONS: Array<{ value: LinkedInJobSortBy; label: string }> = [
  { value: "DATE_DESC", label: "Most recent" },
  { value: "RELEVANCE", label: "Relevance" },
];

export function labelForLinkedInSort(value: LinkedInJobSortBy): string {
  return LINKEDIN_SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Most recent";
}
