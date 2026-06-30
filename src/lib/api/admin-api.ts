import type { AssistantContext } from "@/lib/types/assistant";
import type {
  AssistantClassification,
  CreateKnowledgeEntryInput,
  KnowledgeEntry,
  UpdateKnowledgeEntryInput,
} from "@/lib/types/knowledge";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CLASSIFY_ASSISTANT_MESSAGE_QUERY,
  CREATE_KNOWLEDGE_ENTRY_MUTATION,
  DELETE_KNOWLEDGE_ENTRY_MUTATION,
  KNOWLEDGE_ENTRIES_QUERY,
  UPDATE_KNOWLEDGE_ENTRY_MUTATION,
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
