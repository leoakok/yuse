export type WaitlistStatus = "PENDING" | "APPROVED" | "REJECTED";

export type WaitlistEntry = {
  id: string;
  email: string;
  status: WaitlistStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditLogEntry = {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminSection = "users" | "waitlist" | "invites" | "audit" | "emails" | "linkedin" | "agent" | "system";

export type LinkedInWorkplaceType = "REMOTE" | "HYBRID" | "ON_SITE";
export type LinkedInExperienceLevel =
  | "INTERNSHIP"
  | "ENTRY"
  | "ASSOCIATE"
  | "MID_SENIOR"
  | "DIRECTOR"
  | "EXECUTIVE";
export type LinkedInEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "TEMPORARY"
  | "INTERNSHIP"
  | "VOLUNTEER";

export type LinkedInJobCard = {
  jobId: string;
  title: string;
  company?: string | null;
  location?: string | null;
  workplaceType?: string | null;
  employmentType?: string | null;
  listedAt?: string | null;
  description?: string | null;
  url: string;
};

export type TestEmailType =
  | "WELCOME"
  | "BETA_APPROVAL"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET";

export type SendTestEmailResult = {
  success: boolean;
  message?: string | null;
};

export type InviteLink = {
  id: string;
  code: string;
  label?: string | null;
  emailRestrict?: string | null;
  maxUses?: number | null;
  useCount: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
  urlPath: string;
};

export type PublicInvitePreview = {
  code: string;
  label?: string | null;
  emailRestrict?: string | null;
  remainingUses?: number | null;
  expired: boolean;
};
