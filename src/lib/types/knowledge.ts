// Types for the AI-native intent layer and curated knowledge dictionary.

export type AssistantCategory =
  | "UPDATE_CV"
  | "CREATE_CV"
  | "PORTFOLIO"
  | "JOB_APPLICATION"
  | "ADVICE"
  | "OUT_OF_SCOPE"
  | "CHITCHAT"
  | "UNCLEAR";

export const ASSISTANT_CATEGORIES: AssistantCategory[] = [
  "UPDATE_CV",
  "CREATE_CV",
  "PORTFOLIO",
  "JOB_APPLICATION",
  "ADVICE",
  "OUT_OF_SCOPE",
  "CHITCHAT",
  "UNCLEAR",
];

export const CATEGORY_LABELS: Record<AssistantCategory, string> = {
  UPDATE_CV: "Update CV",
  CREATE_CV: "Create CV",
  PORTFOLIO: "Portfolio",
  JOB_APPLICATION: "Job application",
  ADVICE: "Advice",
  OUT_OF_SCOPE: "Out of scope",
  CHITCHAT: "Greeting / chit-chat",
  UNCLEAR: "Unclear",
};

export interface KnowledgeEntry {
  id: string;
  slug: string;
  title: string;
  category: AssistantCategory;
  tags: string[];
  body: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeEntryInput {
  slug: string;
  title: string;
  category: AssistantCategory;
  tags: string[];
  body: string;
  enabled: boolean;
}

export interface UpdateKnowledgeEntryInput {
  id: string;
  slug?: string;
  title?: string;
  category?: AssistantCategory;
  tags?: string[];
  body?: string;
  enabled?: boolean;
}

export interface AssistantClassification {
  category: AssistantCategory;
  confidence: number;
  tags: string[];
  reason: string;
  source: string;
  scopeHandled: boolean;
  cannedReply?: string | null;
  selectedEntries: KnowledgeEntry[];
  guidance: string;
}
