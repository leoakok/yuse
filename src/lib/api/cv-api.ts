import type {
  AssistantContext,
  AssistantAttachmentPayload,
  AssistantMessage,
  AssistantThread,
  AssistantTurnResult,
  AssistantActionLog,
  AgentState,
} from "@/lib/types/assistant";
import type {
  Resume,
  ResumeSettings,
  ResumeWithContent,
  Section,
  SectionItem,
  ItemTitleLayout,
  ItemTitleSeparator,
  ItemTitleOrder,
  FontFamily,
  SectionDividerStyle,
  DateFormat,
  DatePosition,
  SkillsLayout,
  ColumnLayout,
  SidebarPosition,
  SidebarWidth,
  DesignPresetId,
  PhotoPosition,
  PhotoSize,
  ContactLayout,
  ContactField,
  CvFontSize,
  SectionItemMetadata,
  SectionItemUsage,
  PageFormat,
} from "@/lib/types/cv";
import type { User, Workspace } from "@/lib/types/user";
import type {
  CreateTwinEntryInput,
  TwinEntry,
  UpdateTwinEntryInput,
} from "@/lib/types/twin";
import type {
  TrackedJob,
  UpdateTrackedJobInput,
} from "@/lib/types/job";
import { mapPortfolioWithContent } from "@/lib/api/portfolio-api";
import { DEFAULT_CV_TYPOGRAPHY_SETTINGS, normalizeFontSize } from "@/lib/cv/typography";
import { DEFAULT_CV_FONT_FAMILY, normalizeFontFamily } from "@/lib/cv/fonts";
import { DEFAULT_PAGE_MARGIN_MM, snapMarginMm } from "@/lib/cv/page-format";
import { DEFAULT_RESUME_ACCENT_COLOR, mapSectionDividerStyle } from "@/lib/cv/accent";
import { normalizeContactFields } from "@/lib/cv/contact-header";
import { normalizeDesignPresetId } from "@/lib/cv/design-presets";
import {
  DEFAULT_RESUME_DESIGN_EXTENSION,
  pickResumeDesignExtension,
} from "@/lib/cv/resume-design";
import { normalizeUserMessage } from "@/lib/assistant/attachments";
import {
  ASSISTANT_MESSAGES_QUERY,
  ASSISTANT_THREADS_QUERY,
  CREATE_ASSISTANT_THREAD_MUTATION,
  CREATE_RESUME_MUTATION,
  CREATE_TWIN_ENTRY_MUTATION,
  CREATE_TRACKED_JOB_MUTATION,
  DELETE_ASSISTANT_THREAD_MUTATION,
  DELETE_TWIN_ENTRY_MUTATION,
  DELETE_TRACKED_JOB_MUTATION,
  DUPLICATE_RESUME_MUTATION,
  DELETE_RESUME_MUTATION,
  ME_QUERY,
  MY_WORKSPACE_QUERY,
  WORKSPACE_BOOTSTRAP_QUERY,
  RESUME_WITH_CONTENT_QUERY,
  RESUMES_FOR_SECTION_QUERY,
  RESUMES_QUERY,
  SECTION_ITEM_QUERY,
  SECTION_ITEM_USAGE_QUERY,
  SECTION_ITEMS_FOR_SECTION_QUERY,
  SECTION_ITEMS_QUERY,
  SECTION_QUERY,
  SECTIONS_QUERY,
  SEND_ASSISTANT_MESSAGE_MUTATION,
  TWIN_ENTRIES_QUERY,
  TRACKED_JOBS_QUERY,
  UPDATE_TWIN_ENTRY_MUTATION,
  UPDATE_TRACKED_JOB_MUTATION,
  UPDATE_RESUME_SECTION_ITEM_VISIBILITY_MUTATION,
  UPDATE_RESUME_SECTION_ITEM_MUTATION,
  ADD_RESUME_SECTION_ITEM_MUTATION,
  DELETE_SECTION_ITEM_MUTATION,
  UPDATE_RESUME_SETTINGS_MUTATION,
  UPDATE_RESUME_SECTION_DISPLAY_TITLE_MUTATION,
  REORDER_RESUME_SECTIONS_MUTATION,
  UPDATE_RESUME_SECTION_VISIBILITY_MUTATION,
  UPDATE_CONTACT_PROFILE_MUTATION,
  REQUEST_PROFILE_PHOTO_UPLOAD_MUTATION,
} from "@/lib/graphql/operations";
import { buildAgentSteps } from "@/lib/assistant/state";
import { AGENT_PHASE_LABELS } from "@/lib/types/assistant";
import { graphqlRequest } from "@/lib/graphql/client";

function mapMetadata(metadata: Record<string, unknown> | null | undefined) {
  const result: Record<string, string | undefined> = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (value != null) {
      result[key] = String(value);
    }
  }
  return result;
}

function mapResume(r: Resume): Resume {
  return { ...r };
}

function mapWorkspaceSectionItem(item: SectionItem): SectionItem {
  return {
    ...item,
    showInPreview: item.showInPreview ?? true,
    metadata: mapMetadata(item.metadata as Record<string, unknown>),
  };
}

function mapResumeSectionItem(item: SectionItem): SectionItem {
  return {
    ...item,
    showInPreview: item.showInPreview ?? false,
    metadata: mapMetadata(item.metadata as Record<string, unknown>),
  };
}

export async function getMe(): Promise<User> {
  const data = await graphqlRequest<{ me: User }>(ME_QUERY);
  return data.me;
}

export async function getMyWorkspace(): Promise<Workspace> {
  const data = await graphqlRequest<{ myWorkspace: Workspace }>(MY_WORKSPACE_QUERY);
  return mapWorkspace(data.myWorkspace);
}

function mapWorkspace(workspace: Workspace): Workspace {
  return {
    ...workspace,
    plan: workspace.plan as Workspace["plan"],
  };
}

let bootstrapWorkspacePromise: Promise<{ user: User; workspace: Workspace }> | null =
  null;

export async function bootstrapWorkspace(): Promise<{ user: User; workspace: Workspace }> {
  if (!bootstrapWorkspacePromise) {
    bootstrapWorkspacePromise = graphqlRequest<{ me: User; myWorkspace: Workspace }>(
      WORKSPACE_BOOTSTRAP_QUERY,
    )
      .then((data) => ({
        user: data.me,
        workspace: mapWorkspace(data.myWorkspace),
      }))
      .finally(() => {
        bootstrapWorkspacePromise = null;
      });
  }
  return bootstrapWorkspacePromise;
}

export async function listResumes(): Promise<Resume[]> {
  const data = await graphqlRequest<{ resumes: Resume[] }>(RESUMES_QUERY);
  return data.resumes.map(mapResume);
}

function mapPageFormat(value: string | undefined): PageFormat {
  return value === "LETTER" ? "LETTER" : "A4";
}

function mapItemTitleLayout(value: string | undefined): ItemTitleLayout {
  return value === "INLINE" ? "INLINE" : "STACKED";
}

function mapItemTitleSeparator(value: string | undefined): ItemTitleSeparator {
  if (value === "PIPE") return "PIPE";
  if (value === "COMMA") return "COMMA";
  return "DOT";
}

function mapFontFamily(value: string | undefined): FontFamily {
  return normalizeFontFamily(value);
}

function mapItemTitleOrder(value: string | undefined): ItemTitleOrder {
  return value === "COMPANY_FIRST" ? "COMPANY_FIRST" : "TITLE_FIRST";
}

function mapDateFormat(value: string | undefined): DateFormat {
  if (value === "MM_YYYY") return "MM_YYYY";
  if (value === "YYYY") return "YYYY";
  if (value === "ISO") return "ISO";
  return "MON_YYYY";
}

function mapDatePosition(value: string | undefined): DatePosition {
  if (value === "BELOW") return "BELOW";
  if (value === "INLINE") return "INLINE";
  return "RIGHT";
}

function mapSkillsLayout(value: string | undefined): SkillsLayout {
  if (value === "TAGS") return "TAGS";
  if (value === "COLUMNS") return "COLUMNS";
  return "LIST";
}

function mapColumnLayout(value: string | undefined): ColumnLayout {
  return value === "TWO_COLUMN" ? "TWO_COLUMN" : "SINGLE";
}

function mapSidebarPosition(value: string | undefined): SidebarPosition {
  return value === "RIGHT" ? "RIGHT" : "LEFT";
}

function mapSidebarWidth(value: string | undefined): SidebarWidth {
  if (value === "NARROW") return "NARROW";
  if (value === "WIDE") return "WIDE";
  return "MEDIUM";
}

function mapPhotoPosition(value: string | undefined): PhotoPosition {
  if (value === "HEADER_RIGHT") return "HEADER_RIGHT";
  if (value === "SIDEBAR") return "SIDEBAR";
  if (value === "NONE") return "NONE";
  return "HEADER_LEFT";
}

function mapPhotoSize(value: string | undefined): PhotoSize {
  if (value === "XS") return "XS";
  if (value === "S") return "S";
  if (value === "L") return "L";
  if (value === "XL") return "XL";
  return "M";
}

function mapContactLayout(value: string | undefined): ContactLayout {
  if (value === "STACKED") return "STACKED";
  if (value === "ICON_LABEL") return "ICON_LABEL";
  return "INLINE";
}

function mapContactFields(value: ContactField[] | string[] | undefined): ContactField[] {
  if (!value?.length) return normalizeContactFields(undefined);
  return normalizeContactFields(value as ContactField[]);
}

function mapFontSize(value: string | undefined): CvFontSize {
  return normalizeFontSize(value);
}

function mapResumeSettings(settings: ResumeSettings): ResumeSettings {
  return {
    ...settings,
    fontSize: mapFontSize(settings.fontSize as string | undefined),
    contactNameFontSize: mapFontSize(settings.contactNameFontSize as string | undefined),
    contactHeadlineFontSize: mapFontSize(settings.contactHeadlineFontSize as string | undefined),
    contactDetailsFontSize: mapFontSize(settings.contactDetailsFontSize as string | undefined),
    sectionTitleFontSize: mapFontSize(settings.sectionTitleFontSize as string | undefined),
    itemTitleFontSize: mapFontSize(settings.itemTitleFontSize as string | undefined),
    itemMetaFontSize: mapFontSize(settings.itemMetaFontSize as string | undefined),
    pageFormat: mapPageFormat(settings.pageFormat as string | undefined),
    marginHorizontalMm: snapMarginMm(settings.marginHorizontalMm ?? DEFAULT_PAGE_MARGIN_MM),
    marginVerticalMm: snapMarginMm(settings.marginVerticalMm ?? DEFAULT_PAGE_MARGIN_MM),
    itemTitleLayout: mapItemTitleLayout(settings.itemTitleLayout as string | undefined),
    itemTitleSeparator: mapItemTitleSeparator(settings.itemTitleSeparator as string | undefined),
    itemTitleOrder: mapItemTitleOrder(settings.itemTitleOrder as string | undefined),
    fontFamily: mapFontFamily(settings.fontFamily as string | undefined ?? DEFAULT_CV_FONT_FAMILY),
    accentColor: settings.accentColor?.trim() || DEFAULT_RESUME_ACCENT_COLOR,
    sectionDividerStyle: mapSectionDividerStyle(settings.sectionDividerStyle as string | undefined),
    dateFormat: mapDateFormat(settings.dateFormat as string | undefined),
    datePosition: mapDatePosition(settings.datePosition as string | undefined),
    skillsLayout: mapSkillsLayout(settings.skillsLayout as string | undefined),
    atsMode: settings.atsMode ?? false,
    columnLayout: mapColumnLayout(settings.columnLayout as string | undefined),
    sidebarPosition: mapSidebarPosition(settings.sidebarPosition as string | undefined),
    sidebarWidth: mapSidebarWidth(settings.sidebarWidth as string | undefined),
    designPresetId: normalizeDesignPresetId(settings.designPresetId as string | undefined),
    photoPosition: mapPhotoPosition(settings.photoPosition as string | undefined),
    photoSize: mapPhotoSize(settings.photoSize as string | undefined),
    contactLayout: mapContactLayout(settings.contactLayout as string | undefined),
    contactFields: mapContactFields(settings.contactFields),
    ...pickResumeDesignExtension(settings),
  };
}

export function mapResumeWithContent(data: ResumeWithContent): ResumeWithContent {
  return {
    ...data,
    settings: mapResumeSettings({
      ...DEFAULT_CV_TYPOGRAPHY_SETTINGS,
      ...DEFAULT_RESUME_DESIGN_EXTENSION,
      ...data.settings,
    } as ResumeSettings),
    sections: data.sections.map((s) => ({
      section: s.section,
      displayTitle: s.displayTitle,
      items: s.items.map(mapResumeSectionItem),
      showInPreview: s.showInPreview ?? true,
    })),
  };
}

export async function getResumeWithContent(id: string): Promise<ResumeWithContent | undefined> {
  const data = await graphqlRequest<{ resumeWithContent: ResumeWithContent | null }>(
    RESUME_WITH_CONTENT_QUERY,
    { id }
  );
  if (!data.resumeWithContent) return undefined;
  return mapResumeWithContent(data.resumeWithContent);
}

export async function updateResumeSettings(
  resumeId: string,
  patch: Partial<Omit<ResumeSettings, "resumeId">>
): Promise<ResumeSettings> {
  const input: Record<string, unknown> = { resumeId };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      input[key] = value;
    }
  }

  const data = await graphqlRequest<{ updateResumeSettings: ResumeSettings }>(
    UPDATE_RESUME_SETTINGS_MUTATION,
    { input }
  );
  return mapResumeSettings({
    ...DEFAULT_CV_TYPOGRAPHY_SETTINGS,
    ...DEFAULT_RESUME_DESIGN_EXTENSION,
    ...data.updateResumeSettings,
  } as ResumeSettings);
}

export async function updateResumeSectionDisplayTitle(
  resumeId: string,
  sectionId: string,
  displayTitle: string | null
): Promise<ResumeWithContent> {
  const data = await graphqlRequest<{
    updateResumeSectionDisplayTitle: ResumeWithContent;
  }>(UPDATE_RESUME_SECTION_DISPLAY_TITLE_MUTATION, {
    input: { resumeId, sectionId, displayTitle },
  });
  return mapResumeWithContent(data.updateResumeSectionDisplayTitle);
}

export async function updateResumeSectionItemVisibility(
  resumeId: string,
  sectionId: string,
  sectionItemId: string,
  showInPreview: boolean
): Promise<ResumeWithContent> {
  const data = await graphqlRequest<{
    updateResumeSectionItemVisibility: ResumeWithContent;
  }>(UPDATE_RESUME_SECTION_ITEM_VISIBILITY_MUTATION, {
    input: { resumeId, sectionId, sectionItemId, showInPreview },
  });
  return mapResumeWithContent(data.updateResumeSectionItemVisibility);
}

export async function reorderResumeSections(
  resumeId: string,
  sectionIds: string[]
): Promise<ResumeWithContent> {
  const data = await graphqlRequest<{
    reorderResumeSections: ResumeWithContent;
  }>(REORDER_RESUME_SECTIONS_MUTATION, {
    input: { resumeId, sectionIds },
  });
  return mapResumeWithContent(data.reorderResumeSections);
}

export async function updateResumeSectionVisibility(
  resumeId: string,
  sectionId: string,
  showInPreview: boolean
): Promise<ResumeWithContent> {
  const data = await graphqlRequest<{
    updateResumeSectionVisibility: ResumeWithContent;
  }>(UPDATE_RESUME_SECTION_VISIBILITY_MUTATION, {
    input: { resumeId, sectionId, showInPreview },
  });
  return mapResumeWithContent(data.updateResumeSectionVisibility);
}

export async function updateResumeSectionItem(
  resumeId: string,
  sectionId: string,
  sectionItemId: string,
  updates: {
    headline?: string;
    body?: string;
    metadata?: SectionItemMetadata;
  }
): Promise<ResumeWithContent> {
  const input: Record<string, unknown> = { resumeId, sectionId, sectionItemId };
  if (updates.headline != null) input.headline = updates.headline;
  if (updates.body != null) input.body = updates.body;
  if (updates.metadata != null) input.metadata = updates.metadata;

  const data = await graphqlRequest<{
    updateResumeSectionItem: ResumeWithContent;
  }>(UPDATE_RESUME_SECTION_ITEM_MUTATION, { input });
  return mapResumeWithContent(data.updateResumeSectionItem);
}

export async function addResumeSectionItem(
  resumeId: string,
  sectionId: string,
  headline?: string,
  body?: string,
  metadata?: Record<string, string>
): Promise<ResumeWithContent> {
  const input: Record<string, unknown> = { resumeId, sectionId };
  if (headline != null) input.headline = headline;
  if (body != null) input.body = body;
  if (metadata != null) input.metadata = metadata;

  const data = await graphqlRequest<{
    addResumeSectionItem: ResumeWithContent;
  }>(ADD_RESUME_SECTION_ITEM_MUTATION, { input });
  return mapResumeWithContent(data.addResumeSectionItem);
}

export async function deleteSectionItem(
  resumeId: string,
  sectionItemId: string
): Promise<ResumeWithContent> {
  const data = await graphqlRequest<{
    deleteSectionItem: ResumeWithContent;
  }>(DELETE_SECTION_ITEM_MUTATION, { resumeId, sectionItemId });
  return mapResumeWithContent(data.deleteSectionItem);
}

export async function updateContactProfile(
  resumeId: string,
  updates: {
    fullName?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedIn?: string;
    github?: string;
    photoUrl?: string;
    linkedinPhotoUrl?: string;
    githubPhotoUrl?: string;
  }
): Promise<ResumeWithContent> {
  const input: Record<string, unknown> = { resumeId };
  if (updates.fullName != null) input.fullName = updates.fullName;
  if (updates.headline != null) input.headline = updates.headline;
  if (updates.email != null) input.email = updates.email;
  if (updates.phone != null) input.phone = updates.phone;
  if (updates.location != null) input.location = updates.location;
  if (updates.website != null) input.website = updates.website;
  if (updates.linkedIn != null) input.linkedIn = updates.linkedIn;
  if (updates.github != null) input.github = updates.github;
  if (updates.photoUrl != null) input.photoUrl = updates.photoUrl;

  const data = await graphqlRequest<{
    updateContactProfile: ResumeWithContent;
  }>(UPDATE_CONTACT_PROFILE_MUTATION, { input });
  return mapResumeWithContent(data.updateContactProfile);
}

export interface ProfilePhotoUpload {
  uploadUrl: string;
  photoUrl: string;
  contentType: string;
  maxBytes: number;
}

export async function requestProfilePhotoUpload(
  contentType: string,
  fileName: string
): Promise<ProfilePhotoUpload> {
  const data = await graphqlRequest<{
    requestProfilePhotoUpload: ProfilePhotoUpload;
  }>(REQUEST_PROFILE_PHOTO_UPLOAD_MUTATION, { contentType, fileName });
  return data.requestProfilePhotoUpload;
}

export async function uploadProfilePhoto(
  resumeId: string,
  file: File
): Promise<ResumeWithContent> {
  const upload = await requestProfilePhotoUpload(file.type, file.name);
  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": upload.contentType },
    body: file,
  });
  if (!response.ok) {
    throw new Error("Upload failed");
  }
  return updateContactProfile(resumeId, { photoUrl: upload.photoUrl });
}

export async function removeProfilePhoto(resumeId: string): Promise<ResumeWithContent> {
  return updateContactProfile(resumeId, { photoUrl: "" });
}

export async function listSections(type?: string): Promise<Section[]> {
  const data = await graphqlRequest<{ sections: Section[] }>(SECTIONS_QUERY, { type });
  return data.sections;
}

export async function getSection(id: string): Promise<Section | undefined> {
  const data = await graphqlRequest<{ section: Section | null }>(SECTION_QUERY, { id });
  return data.section ?? undefined;
}

export async function listSectionItems(type?: string): Promise<SectionItem[]> {
  const data = await graphqlRequest<{ sectionItems: SectionItem[] }>(SECTION_ITEMS_QUERY, {
    type,
  });
  return data.sectionItems.map(mapWorkspaceSectionItem);
}

export async function getSectionItem(id: string): Promise<SectionItem | undefined> {
  const data = await graphqlRequest<{ sectionItem: SectionItem | null }>(
    SECTION_ITEM_QUERY,
    { id }
  );
  if (!data.sectionItem) return undefined;
  return mapWorkspaceSectionItem(data.sectionItem);
}

export async function getSectionItemUsage(id: string): Promise<SectionItemUsage | undefined> {
  const data = await graphqlRequest<{ sectionItemUsage: SectionItemUsage | null }>(
    SECTION_ITEM_USAGE_QUERY,
    { id }
  );
  if (!data.sectionItemUsage) return undefined;
  return {
    ...data.sectionItemUsage,
    sectionItem: mapWorkspaceSectionItem(data.sectionItemUsage.sectionItem),
  };
}

export async function createResume(title: string): Promise<Resume> {
  const data = await graphqlRequest<{ createResume: Resume }>(CREATE_RESUME_MUTATION, {
    title,
  });
  return data.createResume;
}

export async function duplicateResume(id: string): Promise<Resume> {
  const data = await graphqlRequest<{ duplicateResume: Resume }>(DUPLICATE_RESUME_MUTATION, {
    id,
  });
  return mapResume(data.duplicateResume);
}

export async function deleteResume(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteResume: boolean }>(DELETE_RESUME_MUTATION, { id });
  return data.deleteResume;
}

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

function mapAssistantThread(thread: {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  preview?: string | null;
}): AssistantThread {
  return {
    id: thread.id,
    workspaceId: thread.workspaceId,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    preview: thread.preview ?? undefined,
  };
}

function mapAssistantMessage(message: {
  id: string;
  threadId: string;
  role: string;
  content: string;
  createdAt: string;
}): AssistantMessage {
  return normalizeUserMessage({
    id: message.id,
    threadId: message.threadId,
    role: message.role as AssistantMessage["role"],
    content: message.content,
    createdAt: message.createdAt,
  });
}

export async function getAssistantThreads(): Promise<AssistantThread[]> {
  const data = await graphqlRequest<{ assistantThreads: AssistantThread[] }>(
    ASSISTANT_THREADS_QUERY
  );
  return data.assistantThreads.map(mapAssistantThread);
}

export async function createAssistantThread(): Promise<AssistantThread> {
  const data = await graphqlRequest<{ createAssistantThread: AssistantThread }>(
    CREATE_ASSISTANT_THREAD_MUTATION
  );
  return mapAssistantThread(data.createAssistantThread);
}

export async function deleteAssistantThread(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteAssistantThread: boolean }>(
    DELETE_ASSISTANT_THREAD_MUTATION,
    { id }
  );
  return data.deleteAssistantThread;
}

export async function getAssistantMessages(threadId: string): Promise<AssistantMessage[]> {
  const data = await graphqlRequest<{ assistantMessages: AssistantMessage[] }>(
    ASSISTANT_MESSAGES_QUERY,
    { threadId, limit: 50 }
  );
  return data.assistantMessages.map(mapAssistantMessage);
}

export async function sendAssistantMessage(
  threadId: string,
  content: string,
  context: AssistantContext,
  attachments: AssistantAttachmentPayload[] = [],
  onStateChange?: (state: AgentState) => void,
  hadComposerAttachments = false
): Promise<AssistantTurnResult> {
  const includePrepare = hadComposerAttachments;
  const completedBeforeThink = includePrepare ? ["prepare", "send"] : ["send"];

  onStateChange?.({
    phase: "thinking",
    label: AGENT_PHASE_LABELS.thinking,
    steps: buildAgentSteps("think", completedBeforeThink, includePrepare),
    activities: [],
  });

  try {
    const data = await graphqlRequest<{
      sendAssistantMessage: AssistantTurnResult;
    }>(SEND_ASSISTANT_MESSAGE_MUTATION, {
      threadId,
      text: content,
      context: mapAssistantContext(context),
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        mimeType: attachment.mimeType,
        contentBase64: attachment.contentBase64 ?? null,
        extractedText: attachment.extractedText ?? null,
      })),
    });

    onStateChange?.({
      phase: "ready",
      label: AGENT_PHASE_LABELS.ready,
      steps: buildAgentSteps(
        null,
        includePrepare ? ["prepare", "send", "think"] : ["send", "think"],
        includePrepare
      ),
      activities: [],
    });

    return {
      ...data.sendAssistantMessage,
      messages: data.sendAssistantMessage.messages.map(mapAssistantMessage),
      affectedPortfolioIds: data.sendAssistantMessage.affectedPortfolioIds ?? [],
      resumeWithContent: data.sendAssistantMessage.resumeWithContent
        ? mapResumeWithContent(data.sendAssistantMessage.resumeWithContent)
        : undefined,
      portfolioWithContent: data.sendAssistantMessage.portfolioWithContent
        ? mapPortfolioWithContent(data.sendAssistantMessage.portfolioWithContent)
        : undefined,
    };
  } catch (error) {
    onStateChange?.({
      phase: "error",
      label: AGENT_PHASE_LABELS.error,
      steps: buildAgentSteps(null, completedBeforeThink, includePrepare),
      activities: [],
    });
    throw error;
  }
}

export async function getSectionItemsForSection(sectionId: string): Promise<SectionItem[]> {
  const data = await graphqlRequest<{ sectionItemsForSection: SectionItem[] }>(
    SECTION_ITEMS_FOR_SECTION_QUERY,
    { sectionId }
  );
  return data.sectionItemsForSection.map(mapWorkspaceSectionItem);
}

export async function getResumesForSection(sectionId: string): Promise<Resume[]> {
  const data = await graphqlRequest<{ resumesForSection: Resume[] }>(
    RESUMES_FOR_SECTION_QUERY,
    { sectionId }
  );
  return data.resumesForSection;
}

export async function listTwinEntries(): Promise<TwinEntry[]> {
  const data = await graphqlRequest<{ twinEntries: TwinEntry[] }>(TWIN_ENTRIES_QUERY);
  return data.twinEntries;
}

export async function createTwinEntry(input: CreateTwinEntryInput): Promise<TwinEntry> {
  const data = await graphqlRequest<{ createTwinEntry: TwinEntry }>(
    CREATE_TWIN_ENTRY_MUTATION,
    { input }
  );
  return data.createTwinEntry;
}

export async function updateTwinEntry(input: UpdateTwinEntryInput): Promise<TwinEntry> {
  const data = await graphqlRequest<{ updateTwinEntry: TwinEntry }>(
    UPDATE_TWIN_ENTRY_MUTATION,
    { input }
  );
  return data.updateTwinEntry;
}

export async function deleteTwinEntry(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteTwinEntry: boolean }>(
    DELETE_TWIN_ENTRY_MUTATION,
    { id }
  );
  return data.deleteTwinEntry;
}

export async function listTrackedJobs(): Promise<TrackedJob[]> {
  const data = await graphqlRequest<{ trackedJobs: TrackedJob[] }>(TRACKED_JOBS_QUERY);
  return data.trackedJobs;
}

export async function createTrackedJob(url: string): Promise<TrackedJob> {
  const data = await graphqlRequest<{ createTrackedJob: TrackedJob }>(
    CREATE_TRACKED_JOB_MUTATION,
    { url }
  );
  return data.createTrackedJob;
}

export async function updateTrackedJob(input: UpdateTrackedJobInput): Promise<TrackedJob> {
  const data = await graphqlRequest<{ updateTrackedJob: TrackedJob }>(
    UPDATE_TRACKED_JOB_MUTATION,
    { input }
  );
  return data.updateTrackedJob;
}

export async function deleteTrackedJob(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteTrackedJob: boolean }>(
    DELETE_TRACKED_JOB_MUTATION,
    { id }
  );
  return data.deleteTrackedJob;
}
