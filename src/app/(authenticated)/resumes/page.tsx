"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { ResumeGrid } from "@/components/cv/resume-grid";
import { createResume, listResumes } from "@/lib/api/cv-api";
import { resumePath } from "@/lib/cv/routes";
import { Button } from "@/components/ui/button";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { Resume } from "@/lib/types/cv";

export default function ResumesPage() {
  const router = useRouter();
  const { refreshKey } = useCvAssistant();
  const [resumes, setResumes] = useState<Resume[]>([]);

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
        <Button size="sm" className="gap-1.5" onClick={() => void handleNewResume()}>
          <Plus className="size-3.5" />
          New resume
        </Button>
      }
    >
      <ResumeGrid
        resumes={resumes}
        onCreateResume={() => void handleNewResume()}
        onResumeDeleted={(id) => setResumes((current) => current.filter((r) => r.id !== id))}
      />
    </CatalogShell>
  );
}
