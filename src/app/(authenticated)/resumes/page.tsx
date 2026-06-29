"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { ResumeGrid } from "@/components/cv/resume-grid";
import { ResumeImportDialog } from "@/components/cv/resume-import-dialog";
import { Button } from "@/components/ui/button";
import { createResume, listResumes } from "@/lib/api/cv-api";
import { resumePath } from "@/lib/cv/routes";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { Resume } from "@/lib/types/cv";

export default function ResumesPage() {
  const router = useRouter();
  const { refreshKey } = useCvAssistant();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    void listResumes().then(setResumes);
  }, [refreshKey]);

  const handleNewResume = async () => {
    const resume = await createResume("Untitled Resume");
    router.push(resumePath(resume.id));
  };

  return (
    <CatalogShell
      title="Resumes"
      description="Your CV documents with a live preview on each card."
      actions={
        resumes.length > 0 ? (
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
        resumes={resumes}
        onCreateResume={() => void handleNewResume()}
        onImportResume={() => setImportOpen(true)}
        onResumeDeleted={(id) => setResumes((current) => current.filter((r) => r.id !== id))}
      />
      <ResumeImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </CatalogShell>
  );
}
