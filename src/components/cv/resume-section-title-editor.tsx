"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { ResumeWithContent, Section } from "@/lib/types/cv";
import { sectionDisplayTitle } from "@/lib/cv/resume-design";
import { updateResumeSectionDisplayTitle } from "@/lib/api/cv-api";
import { Button } from "@/components/ui/button";
import { ResponsiveEditSheet } from "@/components/ui/responsive-edit-sheet";
import {
  workspaceSectionEditButtonClassName,
  workspaceSectionTitleClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

interface ResumeSectionTitleEditorProps {
  resumeId: string;
  section: Section;
  displayTitle?: string | null;
  onSaved: (content: ResumeWithContent) => void;
}

export function ResumeSectionTitleEditor({
  resumeId,
  section,
  displayTitle,
  onSaved,
}: ResumeSectionTitleEditorProps) {
  const [open, setOpen] = useState(false);
  const shownTitle = sectionDisplayTitle(section, displayTitle);

  function openEditor() {
    setOpen(true);
  }

  async function handleSave(rawValue: string) {
    const next = rawValue.trim();
    const current = displayTitle?.trim() || "";
    const baseline = section.title;
    const resolved = next === baseline || next === "" ? null : next;
    if ((resolved ?? "") === (current || "")) {
      setOpen(false);
      return;
    }

    try {
      const updated = await updateResumeSectionDisplayTitle(
        resumeId,
        section.id,
        resolved
      );
      onSaved(updated);
      setOpen(false);
    } catch {
      toast.error("Could not update section title.");
    }
  }

  return (
    <>
      <div className="group/title flex min-w-0 flex-1 items-center gap-0.5">
        <h2
          className={cn(workspaceSectionTitleClassName, "cursor-pointer truncate")}
          onClick={openEditor}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openEditor();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Edit section title, currently ${shownTitle}`}
        >
          {shownTitle}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={workspaceSectionEditButtonClassName}
          aria-label={`Edit ${shownTitle} title`}
          onClick={openEditor}
        >
          <Pencil />
        </Button>
      </div>

      <ResponsiveEditSheet
        open={open}
        onOpenChange={setOpen}
        title="Section title"
        value={shownTitle}
        label="Display name"
        placeholder={section.title}
        onSave={handleSave}
      />
    </>
  );
}
