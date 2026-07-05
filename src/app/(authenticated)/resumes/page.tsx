"use client";

import { useRouter } from "next/navigation";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { ResumeGrid } from "@/components/cv/resume-grid";
import { ResumeImportDialog } from "@/components/cv/resume-import-dialog";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { createResume, listResumes } from "@/lib/api/cv-api";
import { getCachedResumes, setCachedResumes } from "@/lib/cache/workspace-cache";
import { useStaleWhileRevalidate } from "@/lib/hooks/use-stale-while-revalidate";
import { resumePath } from "@/lib/cv/routes";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import { useState } from "react";

export default function ResumesPage() {
  const router = useRouter();
  const { user } = useWorkspace();
  const { refreshKey } = useCvAssistant();
  const [importOpen, setImportOpen] = useState(false);
  const {
    data: resumes,
    isLoading,
    isRevalidating,
    setData: setResumes,
  } = useStaleWhileRevalidate(
    () => listResumes(),
    [user.id, refreshKey],
    {
      getCached: () => getCachedResumes(user.id),
      setCached: (items) => setCachedResumes(user.id, items),
    }
  );

  const resumeList = resumes ?? [];

  const handleNewResume = async () => {
    const resume = await createResume("Untitled Resume");
    router.push(resumePath(resume.id));
  };

  return (
    <CatalogShell
      title="Resumes"
      description="Your CV documents with a live preview on each card."
      actions={
        resumeList.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            Import a resume
          </Button>
        ) : undefined
      }
    >
      <ResumeGrid
        resumes={resumeList}
        isLoading={isLoading}
        isRevalidating={isRevalidating}
        onCreateResume={() => void handleNewResume()}
        onImportResume={() => setImportOpen(true)}
        onResumeDeleted={(id) =>
          setResumes((current) => (current ?? []).filter((r) => r.id !== id))
        }
      />
      <ResumeImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </CatalogShell>
  );
}
