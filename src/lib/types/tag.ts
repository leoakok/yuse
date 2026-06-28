export type TaggableEntity = "RESUME" | "SECTION" | "SECTION_ITEM";

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
}

export interface EntityTag {
  tagId: string;
  entityType: TaggableEntity;
  entityId: string;
}
