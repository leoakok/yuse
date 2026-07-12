import type { AssistantContext } from "@/lib/types/assistant";
import type {
  AssistantClassification,
  CreateKnowledgeEntryInput,
  KnowledgeEntry,
  UpdateKnowledgeEntryInput,
} from "@/lib/types/knowledge";
import type {
  AdminAuditLogEntry,
  AdminUser,
  SendTestEmailResult,
  TestEmailType,
  WaitlistEntry,
  WaitlistStatus,
  InviteLink,
  LinkedInJobCard,
  LinkedInGeoLocation,
  LinkedInJobSortBy,
  LinkedInWorkplaceType,
  LinkedInExperienceLevel,
  LinkedInEmploymentType,
  JobAutomation,
  AutomationRun,
  LinkedInSessionStatus,
  JobAutomationRunResult,
  CreateJobAutomationInput,
  UpdateJobAutomationInput,
} from "@/lib/types/admin";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  ADMIN_AUDIT_LOG_QUERY,
  ADMIN_USERS_QUERY,
  ADMIN_WAITLIST_QUERY,
  APPROVE_WAITLIST_ENTRY_MUTATION,
  CLASSIFY_ASSISTANT_MESSAGE_QUERY,
  CREATE_KNOWLEDGE_ENTRY_MUTATION,
  DELETE_KNOWLEDGE_ENTRY_MUTATION,
  KNOWLEDGE_ENTRIES_QUERY,
  REJECT_WAITLIST_ENTRY_MUTATION,
  SET_USER_ACTIVE_MUTATION,
  SET_USER_ROLE_MUTATION,
  SEND_TEST_EMAIL_MUTATION,
  UPDATE_KNOWLEDGE_ENTRY_MUTATION,
  ADMIN_INVITE_LINKS_QUERY,
  CREATE_INVITE_LINK_MUTATION,
  UPDATE_INVITE_LINK_MUTATION,
  ADMIN_LINKEDIN_JOB_SEARCH_QUERY,
  ADMIN_LINKEDIN_GEO_SEARCH_QUERY,
  JOB_AUTOMATIONS_QUERY,
  AUTOMATION_RUNS_QUERY,
  LINKEDIN_SESSION_STATUS_QUERY,
  CREATE_JOB_AUTOMATION_MUTATION,
  UPDATE_JOB_AUTOMATION_MUTATION,
  DELETE_JOB_AUTOMATION_MUTATION,
  SAVE_LINKEDIN_SESSION_MUTATION,
  CLEAR_LINKEDIN_SESSION_MUTATION,
  RUN_JOB_AUTOMATION_NOW_MUTATION,
} from "@/lib/graphql/operations";

function mapAssistantContext(context: AssistantContext) {
  const viewMap = {
    resumes: "RESUMES",
    sections: "SECTIONS",
    items: "ITEMS",
    resume_detail: "RESUME_DETAIL",
    portfolios: "PORTFOLIOS",
    portfolio_detail: "PORTFOLIO_DETAIL",
    digital_twin: "DIGITAL_TWIN",
    job_tracker: "JOB_TRACKER",
  } as const;

  return {
    view: viewMap[context.view],
    resumeId: context.resumeId,
    portfolioId: context.portfolioId,
    sectionId: context.sectionId,
    sectionItemId: context.sectionItemId,
    jobId: context.jobId,
  };
}

export async function listKnowledgeEntries(
  includeDisabled = true
): Promise<KnowledgeEntry[]> {
  const data = await graphqlRequest<{ knowledgeEntries: KnowledgeEntry[] }>(
    KNOWLEDGE_ENTRIES_QUERY,
    { includeDisabled }
  );
  return data.knowledgeEntries;
}

export async function classifyAssistantMessage(
  text: string,
  context: AssistantContext
): Promise<AssistantClassification> {
  const data = await graphqlRequest<{ classifyAssistantMessage: AssistantClassification }>(
    CLASSIFY_ASSISTANT_MESSAGE_QUERY,
    { text, context: mapAssistantContext(context) }
  );
  return data.classifyAssistantMessage;
}

export async function createKnowledgeEntry(
  input: CreateKnowledgeEntryInput
): Promise<KnowledgeEntry> {
  const data = await graphqlRequest<{ createKnowledgeEntry: KnowledgeEntry }>(
    CREATE_KNOWLEDGE_ENTRY_MUTATION,
    { input }
  );
  return data.createKnowledgeEntry;
}

export async function updateKnowledgeEntry(
  input: UpdateKnowledgeEntryInput
): Promise<KnowledgeEntry> {
  const data = await graphqlRequest<{ updateKnowledgeEntry: KnowledgeEntry }>(
    UPDATE_KNOWLEDGE_ENTRY_MUTATION,
    { input }
  );
  return data.updateKnowledgeEntry;
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteKnowledgeEntry: boolean }>(
    DELETE_KNOWLEDGE_ENTRY_MUTATION,
    { id }
  );
  return data.deleteKnowledgeEntry;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const data = await graphqlRequest<{ adminUsers: AdminUser[] }>(ADMIN_USERS_QUERY);
  return data.adminUsers;
}

export async function listAdminWaitlist(status?: WaitlistStatus): Promise<WaitlistEntry[]> {
  const data = await graphqlRequest<{ adminWaitlist: WaitlistEntry[] }>(ADMIN_WAITLIST_QUERY, {
    status,
  });
  return data.adminWaitlist;
}

export async function listAdminAuditLog(limit = 50): Promise<AdminAuditLogEntry[]> {
  const data = await graphqlRequest<{ adminAuditLog: AdminAuditLogEntry[] }>(
    ADMIN_AUDIT_LOG_QUERY,
    { limit }
  );
  return data.adminAuditLog;
}

export async function approveWaitlistEntry(id: string): Promise<WaitlistEntry> {
  const data = await graphqlRequest<{ approveWaitlistEntry: WaitlistEntry }>(
    APPROVE_WAITLIST_ENTRY_MUTATION,
    { id }
  );
  return data.approveWaitlistEntry;
}

export async function rejectWaitlistEntry(id: string): Promise<WaitlistEntry> {
  const data = await graphqlRequest<{ rejectWaitlistEntry: WaitlistEntry }>(
    REJECT_WAITLIST_ENTRY_MUTATION,
    { id }
  );
  return data.rejectWaitlistEntry;
}

export async function setUserActive(userId: string, active: boolean): Promise<AdminUser> {
  const data = await graphqlRequest<{ setUserActive: AdminUser }>(SET_USER_ACTIVE_MUTATION, {
    userId,
    active,
  });
  return data.setUserActive;
}

export async function setUserRole(
  userId: string,
  role: AdminUser["role"],
): Promise<AdminUser> {
  const data = await graphqlRequest<{ setUserRole: AdminUser }>(SET_USER_ROLE_MUTATION, {
    userId,
    role,
  });
  return data.setUserRole;
}

export async function sendTestEmail(
  type: TestEmailType,
  recipientEmail: string,
): Promise<SendTestEmailResult> {
  const data = await graphqlRequest<{ sendTestEmail: SendTestEmailResult }>(
    SEND_TEST_EMAIL_MUTATION,
    { type, recipientEmail },
  );
  return data.sendTestEmail;
}

export async function listAdminInviteLinks(): Promise<InviteLink[]> {
  const data = await graphqlRequest<{ adminInviteLinks: InviteLink[] }>(ADMIN_INVITE_LINKS_QUERY);
  return data.adminInviteLinks;
}

export async function createInviteLink(input: {
  label?: string;
  emailRestrict?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<InviteLink> {
  const data = await graphqlRequest<{ createInviteLink: InviteLink }>(CREATE_INVITE_LINK_MUTATION, {
    input,
  });
  return data.createInviteLink;
}

export async function updateInviteLink(input: {
  id: string;
  label?: string;
  emailRestrict?: string | null;
  maxUses?: number | null;
  isActive?: boolean;
  expiresAt?: string | null;
}): Promise<InviteLink> {
  const data = await graphqlRequest<{ updateInviteLink: InviteLink }>(UPDATE_INVITE_LINK_MUTATION, {
    input,
  });
  return data.updateInviteLink;
}

export async function adminLinkedInGeoSearch(keywords: string): Promise<LinkedInGeoLocation[]> {
  const data = await graphqlRequest<{ adminLinkedInGeoSearch: LinkedInGeoLocation[] }>(
    ADMIN_LINKEDIN_GEO_SEARCH_QUERY,
    { keywords: keywords.trim() },
  );
  return data.adminLinkedInGeoSearch;
}

export async function adminLinkedInJobSearch(input: {
  keywords?: string;
  geoId?: string;
  timeFilter?: string;
  sortBy?: LinkedInJobSortBy;
  maxResults?: number;
  workplaceTypes?: LinkedInWorkplaceType[];
  experienceLevels?: LinkedInExperienceLevel[];
  employmentTypes?: LinkedInEmploymentType[];
  easyApply?: boolean;
  sessionCookie?: string;
}): Promise<LinkedInJobCard[]> {
  const data = await graphqlRequest<{ adminLinkedInJobSearch: LinkedInJobCard[] }>(
    ADMIN_LINKEDIN_JOB_SEARCH_QUERY,
    {
      keywords: input.keywords?.trim() || null,
      geoId: input.geoId?.trim() || null,
      timeFilter: input.timeFilter || null,
      sortBy: input.sortBy ?? null,
      maxResults: input.maxResults ?? null,
      workplaceTypes: input.workplaceTypes?.length ? input.workplaceTypes : null,
      experienceLevels: input.experienceLevels?.length ? input.experienceLevels : null,
      employmentTypes: input.employmentTypes?.length ? input.employmentTypes : null,
      easyApply: input.easyApply ?? null,
      sessionCookie: input.sessionCookie || null,
    },
  );
  return data.adminLinkedInJobSearch;
}

export async function listJobAutomations(): Promise<JobAutomation[]> {
  const data = await graphqlRequest<{ jobAutomations: JobAutomation[] }>(JOB_AUTOMATIONS_QUERY);
  return data.jobAutomations;
}

export async function listAutomationRuns(automationId: string, limit = 10): Promise<AutomationRun[]> {
  const data = await graphqlRequest<{ automationRuns: AutomationRun[] }>(AUTOMATION_RUNS_QUERY, {
    automationId,
    limit,
  });
  return data.automationRuns;
}

export async function linkedInSessionStatus(): Promise<LinkedInSessionStatus> {
  const data = await graphqlRequest<{ linkedInSessionStatus: LinkedInSessionStatus }>(
    LINKEDIN_SESSION_STATUS_QUERY,
  );
  return data.linkedInSessionStatus;
}

export async function createJobAutomation(input: CreateJobAutomationInput): Promise<JobAutomation> {
  const data = await graphqlRequest<{ createJobAutomation: JobAutomation }>(
    CREATE_JOB_AUTOMATION_MUTATION,
    { input },
  );
  return data.createJobAutomation;
}

export async function updateJobAutomation(input: UpdateJobAutomationInput): Promise<JobAutomation> {
  const data = await graphqlRequest<{ updateJobAutomation: JobAutomation }>(
    UPDATE_JOB_AUTOMATION_MUTATION,
    { input },
  );
  return data.updateJobAutomation;
}

export async function deleteJobAutomation(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteJobAutomation: boolean }>(DELETE_JOB_AUTOMATION_MUTATION, {
    id,
  });
  return data.deleteJobAutomation;
}

export async function saveLinkedInSession(cookie: string): Promise<LinkedInSessionStatus> {
  const data = await graphqlRequest<{ saveLinkedInSession: LinkedInSessionStatus }>(
    SAVE_LINKEDIN_SESSION_MUTATION,
    { cookie },
  );
  return data.saveLinkedInSession;
}

export async function clearLinkedInSession(): Promise<LinkedInSessionStatus> {
  const data = await graphqlRequest<{ clearLinkedInSession: LinkedInSessionStatus }>(
    CLEAR_LINKEDIN_SESSION_MUTATION,
  );
  return data.clearLinkedInSession;
}

export async function runJobAutomationNow(id: string): Promise<JobAutomationRunResult> {
  const data = await graphqlRequest<{ runJobAutomationNow: JobAutomationRunResult }>(
    RUN_JOB_AUTOMATION_NOW_MUTATION,
    { id },
  );
  return data.runJobAutomationNow;
}
