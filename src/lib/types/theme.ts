export interface CvTheme {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  config: Record<string, unknown>;
}
