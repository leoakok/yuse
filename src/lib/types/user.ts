export type WorkspacePlan = "free" | "pro";
export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";
export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: WorkspacePlan;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedAt: string;
  joinedAt?: string;
}

export interface UserPreferences {
  userId: string;
  lastOpenedResumeId?: string;
  assistantPanelOpen: boolean;
  theme: "light" | "dark" | "system";
  locale: string;
}
