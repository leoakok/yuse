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

export type AdminSection = "users" | "waitlist" | "invites" | "audit" | "emails" | "linkedin" | "automations" | "agent" | "system";

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
  | "VOLUNTEER"
  | "OTHER";

export type LinkedInJobSortBy = "DATE_DESC" | "RELEVANCE";

export type LinkedInGeoLocation = {
  geoId: string;
  label: string;
};

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

export type JobAutomation = {
  id: string;
  name: string;
  enabled: boolean;
  keywords?: string | null;
  geoId?: string | null;
  geoLabel?: string | null;
  timeFilter: string;
  workplaceTypes: LinkedInWorkplaceType[];
  experienceLevels: LinkedInExperienceLevel[];
  employmentTypes: LinkedInEmploymentType[];
  easyApply: boolean;
  sortBy: LinkedInJobSortBy;
  maxResults: number;
  matchCriteria: string;
  intervalMinutes: number;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  notifyEmail: string;
  sessionInvalid: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRunStatus = "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";

export type AutomationRun = {
  id: string;
  automationId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: AutomationRunStatus;
  jobsFetched: number;
  jobsMatched: number;
  jobsEmailed: number;
  error?: string | null;
};

export type LinkedInSessionStatus = {
  configured: boolean;
  updatedAt?: string | null;
};

export type JobAutomationRunResult = {
  run: AutomationRun;
  matches: LinkedInJobCard[];
};

export type AutomationMatchFeedback = "LIKED" | "DISLIKED" | "NONE";

export type AutomationMatchedJob = {
  jobId: string;
  title: string;
  company?: string | null;
  location?: string | null;
  workplaceType?: string | null;
  employmentType?: string | null;
  listedAt?: string | null;
  description?: string | null;
  url: string;
  matchReason?: string | null;
  feedback?: AutomationMatchFeedback | null;
  feedbackAt?: string | null;
  runId?: string | null;
  firstMatchedAt: string;
};

export type AutomationCompanyBan = {
  id: string;
  companyDisplay: string;
  createdAt: string;
};

export type CreateJobAutomationInput = {
  name: string;
  enabled?: boolean;
  keywords?: string;
  geoId?: string;
  geoLabel?: string;
  timeFilter?: string;
  workplaceTypes?: LinkedInWorkplaceType[];
  experienceLevels?: LinkedInExperienceLevel[];
  employmentTypes?: LinkedInEmploymentType[];
  easyApply?: boolean;
  sortBy?: LinkedInJobSortBy;
  maxResults?: number;
  matchCriteria: string;
  intervalMinutes: number;
  notifyEmail?: string;
};

export type UpdateJobAutomationInput = {
  id: string;
  name?: string;
  enabled?: boolean;
  keywords?: string | null;
  geoId?: string | null;
  geoLabel?: string | null;
  timeFilter?: string;
  workplaceTypes?: LinkedInWorkplaceType[];
  experienceLevels?: LinkedInExperienceLevel[];
  employmentTypes?: LinkedInEmploymentType[];
  easyApply?: boolean;
  sortBy?: LinkedInJobSortBy;
  maxResults?: number;
  matchCriteria?: string;
  intervalMinutes?: number;
  notifyEmail?: string;
};
