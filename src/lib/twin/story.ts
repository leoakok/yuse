export const TWIN_META_KEYS = {
  storyFormat: "storyFormat",
  situation: "situation",
  task: "task",
  problem: "problem",
  action: "action",
  result: "result",
} as const;

export type StoryFormat = "STAR" | "PAR";

export interface TwinStoryFields {
  storyFormat?: StoryFormat;
  situation?: string;
  task?: string;
  problem?: string;
  action?: string;
  result?: string;
}

export function readTwinStory(metadata: Record<string, unknown>): TwinStoryFields {
  const str = (key: string) => {
    const v = metadata[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const format = str(TWIN_META_KEYS.storyFormat);
  return {
    storyFormat: format === "STAR" || format === "PAR" ? format : undefined,
    situation: str(TWIN_META_KEYS.situation),
    task: str(TWIN_META_KEYS.task),
    problem: str(TWIN_META_KEYS.problem),
    action: str(TWIN_META_KEYS.action),
    result: str(TWIN_META_KEYS.result),
  };
}

export function inferStoryFormat(
  type: string,
  story: TwinStoryFields
): StoryFormat {
  if (story.storyFormat) return story.storyFormat;
  if (type === "PROJECT" || type === "SKILL_AREA") return "PAR";
  if (story.problem) return "PAR";
  return "STAR";
}

export function missingStoryPieces(
  type: string,
  story: TwinStoryFields
): string[] {
  const format = inferStoryFormat(type, story);
  if (format === "PAR") {
    return ["problem", "action", "result"].filter(
      (k) => !story[k as keyof TwinStoryFields]
    );
  }
  return ["situation", "task", "action", "result"].filter(
    (k) => !story[k as keyof TwinStoryFields]
  );
}

export function storyPreview(
  type: string,
  metadata: Record<string, unknown>
): string | null {
  const story = readTwinStory(metadata);
  const format = inferStoryFormat(type, story);
  const parts: string[] = [];
  if (format === "PAR") {
    if (story.problem) parts.push(story.problem);
    if (story.action) parts.push(story.action);
    if (story.result) parts.push(story.result);
  } else {
    if (story.situation) parts.push(story.situation);
    if (story.task) parts.push(story.task);
    if (story.action) parts.push(story.action);
    if (story.result) parts.push(story.result);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
