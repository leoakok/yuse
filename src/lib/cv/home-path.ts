import { listResumes } from "@/lib/api/cv-api";
import { resumePath } from "@/lib/cv/routes";
import {
  clearLastOpenedResumeId,
  getLastOpenedResumeId,
} from "@/lib/cv/preferences";

export async function resolveHomePath(userId: string): Promise<string> {
  const resumes = await listResumes();
  if (resumes.length === 0) {
    return "/resumes";
  }

  const lastOpened = getLastOpenedResumeId(userId);
  if (lastOpened && resumes.some((resume) => resume.id === lastOpened)) {
    return resumePath(lastOpened);
  }

  if (lastOpened) {
    clearLastOpenedResumeId(userId);
  }

  return "/resumes";
}
