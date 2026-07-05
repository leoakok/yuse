"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
} from "@/components/ui/responsive-dialog";

interface ResponsiveEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  /** Field label when it serves a different purpose than the sheet title. */
  label?: string;
  /** Helper text below the input. May depend on the current draft value. */
  description?: ReactNode | ((draft: string) => ReactNode);
  /** Force-hide the field label even when `label` is set. */
  hideLabel?: boolean;
  inputType?: string;
  autoComplete?: string;
  spellCheck?: boolean;
  saving?: boolean;
}

function resolveDescription(
  description: ResponsiveEditSheetProps["description"],
  draft: string
): ReactNode {
  if (!description) return null;
  return typeof description === "function" ? description(draft) : description;
}

function EditField({
  draft,
  disabled,
  title,
  label,
  hideLabel,
  description,
  placeholder,
  inputType,
  autoComplete,
  spellCheck,
  onChange,
  onSubmit,
}: {
  draft: string;
  disabled: boolean;
  title: string;
  label?: string;
  hideLabel?: boolean;
  description?: ResponsiveEditSheetProps["description"];
  placeholder?: string;
  inputType?: string;
  autoComplete?: string;
  spellCheck?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const showLabel = Boolean(label) && label !== title && !hideLabel;
  const helper = resolveDescription(description, draft);

  return (
    <div className="grid gap-1.5">
      {showLabel ? <label className="text-sm font-medium">{label}</label> : null}
      <Input
        type={inputType}
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        disabled={disabled}
        autoFocus
        aria-label={showLabel ? undefined : title}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function ResponsiveEditSheet({
  open,
  onOpenChange,
  title,
  value,
  onSave,
  placeholder,
  label,
  description,
  hideLabel,
  inputType,
  autoComplete,
  spellCheck,
  saving: savingProp,
}: ResponsiveEditSheetProps) {
  const [draft, setDraft] = useState(value);
  const [internalSaving, setInternalSaving] = useState(false);
  const isSaving = savingProp ?? internalSaving;

  useEffect(() => {
    if (!open) return;
    setDraft(value);
  }, [open, value]);

  async function handleSave() {
    if (isSaving) return;
    if (savingProp === undefined) {
      setInternalSaving(true);
    }
    try {
      await onSave(draft);
    } finally {
      if (savingProp === undefined) {
        setInternalSaving(false);
      }
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader title={title} />
        <ResponsiveDialogBody className="py-0">
          <EditField
            draft={draft}
            disabled={isSaving}
            title={title}
            label={label}
            hideLabel={hideLabel}
            description={description}
            placeholder={placeholder}
            inputType={inputType}
            autoComplete={autoComplete}
            spellCheck={spellCheck}
            onChange={setDraft}
            onSubmit={() => void handleSave()}
          />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
