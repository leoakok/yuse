"use client";

import { useEffect, useState } from "react";
import type { ResumeWithContent, SectionItem, SectionType } from "@/lib/types/cv";
import { levelsForSectionType } from "@/lib/cv/levels";
import { addResumeSectionItem, updateResumeSectionItem } from "@/lib/api/cv-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/cv/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SectionItemFormState {
  headline: string;
  body: string;
  company: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  url: string;
  level: string;
}

function emptyFormState(): SectionItemFormState {
  return {
    headline: "",
    body: "",
    company: "",
    institution: "",
    location: "",
    startDate: "",
    endDate: "",
    url: "",
    level: "",
  };
}

function formStateFromItem(item: SectionItem): SectionItemFormState {
  return {
    headline: item.headline,
    body: item.body,
    company: item.metadata.company ?? "",
    institution: item.metadata.institution ?? "",
    location: item.metadata.location ?? "",
    startDate: item.metadata.startDate ?? "",
    endDate: item.metadata.endDate ?? "",
    url: item.metadata.url ?? "",
    level: item.metadata.level ?? "",
  };
}

function buildMetadata(
  type: SectionType,
  form: SectionItemFormState
): Record<string, string> {
  switch (type) {
    case "EXPERIENCE":
      return {
        company: form.company,
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate,
      };
    case "EDUCATION":
      return {
        institution: form.institution,
        startDate: form.startDate,
        endDate: form.endDate,
      };
    case "PROJECTS":
    case "CERTIFICATIONS":
    case "PUBLICATIONS":
    case "AWARDS":
      return { url: form.url };
    case "ORGANIZATIONS":
    case "VOLUNTEER":
      return {
        institution: form.institution,
        url: form.url,
        startDate: form.startDate,
        endDate: form.endDate,
      };
    case "SKILLS":
    case "LANGUAGES":
      return form.level ? { level: form.level } : {};
    default:
      return {};
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export type SectionItemDialogState =
  | {
      mode: "create";
      sectionId: string;
      sectionType: SectionType;
      sectionTitle: string;
    }
  | {
      mode: "edit";
      sectionId: string;
      sectionType: SectionType;
      item: SectionItem;
    };

interface SectionItemEditDialogProps {
  resumeId: string;
  dialog: SectionItemDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (content: ResumeWithContent) => void;
}

export function SectionItemEditDialog({
  resumeId,
  dialog,
  onOpenChange,
  onSaved,
}: SectionItemEditDialogProps) {
  const open = dialog != null;
  const [form, setForm] = useState<SectionItemFormState>(emptyFormState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!dialog) {
      setForm(emptyFormState());
      return;
    }
    if (dialog.mode === "edit") {
      setForm(formStateFromItem(dialog.item));
      return;
    }
    setForm(emptyFormState());
  }, [dialog]);

  function updateField<K extends keyof SectionItemFormState>(
    key: K,
    value: SectionItemFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!dialog || isSaving) return;
    setIsSaving(true);
    try {
      const metadata = buildMetadata(dialog.sectionType, form);
      const updated =
        dialog.mode === "create"
          ? await addResumeSectionItem(
              resumeId,
              dialog.sectionId,
              form.headline,
              form.body,
              metadata
            )
          : await updateResumeSectionItem(
              resumeId,
              dialog.sectionId,
              dialog.item.id,
              {
                headline: form.headline,
                body: form.body,
                metadata,
              }
            );
      onSaved(updated);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  const sectionType = dialog?.sectionType;
  const title =
    dialog?.mode === "create"
      ? `Add to ${dialog.sectionTitle}`
      : "Edit item";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {dialog?.mode === "create"
              ? "Fill in the details, then save to add this item."
              : "Update the details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {sectionType === "SUMMARY" ? (
            <>
              <FieldGroup label="Title">
                <Input
                  value={form.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder="Professional summary"
                />
              </FieldGroup>
              <FieldGroup label="Summary">
                <RichTextEditor
                  value={form.body}
                  onChange={(value) => updateField("body", value)}
                  placeholder="A short overview of your experience and goals"
                  rows={5}
                />
              </FieldGroup>
            </>
          ) : null}

          {sectionType === "EXPERIENCE" ? (
            <>
              <FieldGroup label="Role">
                <Input
                  value={form.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder="Senior Engineer"
                />
              </FieldGroup>
              <FieldGroup label="Company">
                <Input
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="Acme Corp"
                />
              </FieldGroup>
              <FieldGroup label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Remote"
                />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Start date">
                  <Input
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    placeholder="2021-03"
                  />
                </FieldGroup>
                <FieldGroup label="End date">
                  <Input
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    placeholder="Present"
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Description">
                <RichTextEditor
                  value={form.body}
                  onChange={(value) => updateField("body", value)}
                  placeholder="Key achievements, one per line"
                  rows={5}
                />
              </FieldGroup>
            </>
          ) : null}

          {sectionType === "EDUCATION" ? (
            <>
              <FieldGroup label="Degree or program">
                <Input
                  value={form.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder="MSc Computer Science"
                />
              </FieldGroup>
              <FieldGroup label="Institution">
                <Input
                  value={form.institution}
                  onChange={(e) => updateField("institution", e.target.value)}
                  placeholder="MIT"
                />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Start date">
                  <Input
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    placeholder="2017"
                  />
                </FieldGroup>
                <FieldGroup label="End date">
                  <Input
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    placeholder="2019"
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Details">
                <RichTextEditor
                  value={form.body}
                  onChange={(value) => updateField("body", value)}
                  placeholder="Focus areas, honors, or coursework"
                  rows={4}
                />
              </FieldGroup>
            </>
          ) : null}

          {sectionType === "SKILLS" || sectionType === "LANGUAGES" ? (
            <>
              <FieldGroup label={sectionType === "SKILLS" ? "Skill" : "Language"}>
                <Input
                  value={form.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder={sectionType === "SKILLS" ? "TypeScript" : "English"}
                />
              </FieldGroup>
              <FieldGroup label="Proficiency level">
                <Select
                  value={form.level || undefined}
                  onValueChange={(value) => updateField("level", value ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelsForSectionType(sectionType).map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0) + level.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Notes (optional)">
                <RichTextEditor
                  value={form.body}
                  onChange={(value) => updateField("body", value)}
                  placeholder="Optional context or certification"
                  rows={3}
                />
              </FieldGroup>
            </>
          ) : null}

          {sectionType === "PROJECTS" ||
          sectionType === "CERTIFICATIONS" ||
          sectionType === "PUBLICATIONS" ||
          sectionType === "AWARDS" ||
          sectionType === "ORGANIZATIONS" ||
          sectionType === "VOLUNTEER" ||
          sectionType === "CUSTOM" ? (
            <>
              <FieldGroup label="Title">
                <Input
                  value={form.headline}
                  onChange={(e) => updateField("headline", e.target.value)}
                  placeholder="Item title"
                />
              </FieldGroup>
              {sectionType === "PROJECTS" ||
              sectionType === "CERTIFICATIONS" ||
              sectionType === "PUBLICATIONS" ||
              sectionType === "ORGANIZATIONS" ||
              sectionType === "AWARDS" ? (
                <FieldGroup label="Link">
                  <Input
                    value={form.url}
                    onChange={(e) => updateField("url", e.target.value)}
                    placeholder="https://"
                  />
                </FieldGroup>
              ) : null}
              {sectionType === "VOLUNTEER" ? (
                <>
                  <FieldGroup label="Organization">
                    <Input
                      value={form.institution}
                      onChange={(e) => updateField("institution", e.target.value)}
                      placeholder="Nonprofit or group name"
                    />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Start">
                      <Input
                        value={form.startDate}
                        onChange={(e) => updateField("startDate", e.target.value)}
                        placeholder="2022"
                      />
                    </FieldGroup>
                    <FieldGroup label="End">
                      <Input
                        value={form.endDate}
                        onChange={(e) => updateField("endDate", e.target.value)}
                        placeholder="Present"
                      />
                    </FieldGroup>
                  </div>
                </>
              ) : null}
              {sectionType === "PUBLICATIONS" || sectionType === "AWARDS" ? (
                <FieldGroup label="Year">
                  <Input
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    placeholder="2024"
                  />
                </FieldGroup>
              ) : null}
              <FieldGroup label="Details">
                <RichTextEditor
                  value={form.body}
                  onChange={(value) => updateField("body", value)}
                  placeholder="Description or notes"
                  rows={4}
                />
              </FieldGroup>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
