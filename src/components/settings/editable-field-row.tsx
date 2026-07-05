"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SettingsFieldRow } from "@/components/settings/settings-field-row";
import { ResponsiveEditSheet } from "@/components/ui/responsive-edit-sheet";
import { cn } from "@/lib/utils";

export type EditableFieldValidateResult =
  | { ok: true; value?: string }
  | { ok: false; message: string };

interface EditableFieldRowProps {
  label: string;
  value: string;
  placeholder?: string;
  description?: ReactNode | ((draft: string) => ReactNode);
  emptyValueLabel?: string;
  onSave: (value: string) => Promise<void> | void;
  validate?: (value: string) => EditableFieldValidateResult;
  id?: string;
  inputType?: string;
  autoComplete?: string;
  spellCheck?: boolean;
}

function resolveDescription(
  description: EditableFieldRowProps["description"],
  draft: string
): ReactNode {
  if (!description) return null;
  return typeof description === "function" ? description(draft) : description;
}

export function EditableFieldRow({
  label,
  value,
  placeholder,
  description,
  emptyValueLabel = "Not set",
  onSave,
  validate,
  id,
  inputType = "text",
  autoComplete,
  spellCheck,
}: EditableFieldRowProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayValue = value.trim() || emptyValueLabel;

  async function persist(nextRaw: string) {
    const validation = validate ? validate(nextRaw) : { ok: true as const };
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    const next = validation.value ?? nextRaw;
    if (next === value) {
      setSheetOpen(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(next);
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function openSheet() {
    setSheetOpen(true);
  }

  return (
    <>
      <SettingsFieldRow
        id={id}
        label={label}
        value={displayValue}
        valueClassName={cn(!value.trim() && "text-muted-foreground")}
        description={description ? resolveDescription(description, value) : undefined}
        onEdit={openSheet}
      />

      <ResponsiveEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={label}
        value={value}
        placeholder={placeholder}
        description={description}
        inputType={inputType}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        saving={saving}
        onSave={persist}
      />
    </>
  );
}
