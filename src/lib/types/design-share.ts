export type DesignShareContentMode = "DUMMY" | "REAL";

export type DesignShare = {
  id: string;
  /** Omitted from public REST responses; present on authenticated GraphQL queries. */
  resumeId?: string;
  contentMode: DesignShareContentMode;
  title?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  urlPath: string;
};

export type CuratedTheme = {
  id: string;
  title: string;
  designShareId: string;
  tags: string[];
  featuredOnLanding: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  urlPath: string;
  preview: import("@/lib/types/cv").ResumeWithContent;
};

export type CreateCuratedThemeInput = {
  title: string;
  designUrl: string;
  tags?: string[];
  featuredOnLanding?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
};

export type UpdateCuratedThemeInput = {
  id: string;
  title?: string;
  tags?: string[];
  featuredOnLanding?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
};
