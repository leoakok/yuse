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

export type AdminSection = "users" | "waitlist" | "audit" | "emails" | "agent" | "system";

export type TestEmailType =
  | "WELCOME"
  | "BETA_APPROVAL"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET";

export type SendTestEmailResult = {
  success: boolean;
  message?: string | null;
};
