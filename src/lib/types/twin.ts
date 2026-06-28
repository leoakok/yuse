export type TwinEntryType =
  | "EXPERIENCE"
  | "EDUCATION"
  | "PROJECT"
  | "SKILL_AREA"
  | "OTHER";

export interface TwinEntry {
  id: string;
  workspaceId: string;
  type: TwinEntryType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTwinEntryInput {
  type: TwinEntryType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTwinEntryInput {
  id: string;
  type?: TwinEntryType;
  title?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
}

export const TWIN_ENTRY_TYPE_LABELS: Record<TwinEntryType, string> = {
  EXPERIENCE: "Experience",
  EDUCATION: "Education",
  PROJECT: "Project",
  SKILL_AREA: "Skill area",
  OTHER: "Other",
};

export const TWIN_ENTRY_TYPES: TwinEntryType[] = [
  "EXPERIENCE",
  "EDUCATION",
  "PROJECT",
  "SKILL_AREA",
  "OTHER",
];
