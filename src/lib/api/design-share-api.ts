import { graphqlRequest } from "@/lib/graphql/client";
import {
  APPLY_DESIGN_SHARE_MUTATION,
  CREATE_DESIGN_SHARE_MUTATION,
  DESIGN_SHARE_FOR_RESUME_QUERY,
} from "@/lib/graphql/operations";
import type { DesignShare, DesignShareContentMode } from "@/lib/types/design-share";
import type { Resume } from "@/lib/types/cv";

export async function getDesignShareForResume(resumeId: string): Promise<DesignShare | null> {
  const data = await graphqlRequest<{ designShareForResume: DesignShare | null }>(
    DESIGN_SHARE_FOR_RESUME_QUERY,
    { resumeId },
  );
  return data.designShareForResume;
}

export async function createDesignShare(
  resumeId: string,
  contentMode: DesignShareContentMode,
  title?: string,
): Promise<DesignShare> {
  const data = await graphqlRequest<{ createDesignShare: DesignShare }>(
    CREATE_DESIGN_SHARE_MUTATION,
    { resumeId, contentMode, title: title ?? null },
  );
  return data.createDesignShare;
}

export async function applyDesignShare(designShareId: string, resumeId?: string): Promise<Resume> {
  const data = await graphqlRequest<{ applyDesignShare: Resume }>(
    APPLY_DESIGN_SHARE_MUTATION,
    { designShareId, resumeId: resumeId ?? null },
  );
  return data.applyDesignShare;
}
