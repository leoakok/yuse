"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsFieldRow } from "@/components/settings/settings-field-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
} from "@/components/ui/responsive-dialog";

interface EmailChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSave: (values: { currentPassword: string; email: string }) => Promise<void> | void;
}

function validateEmailAddress(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false as const, message: "Enter an email address." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false as const, message: "Enter a valid email address." };
  }
  return { ok: true as const, value: trimmed.toLowerCase() };
}

export function EmailChangeSheet({
  open,
  onOpenChange,
  currentEmail,
  onSave,
}: EmailChangeSheetProps) {
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(currentEmail);
    setCurrentPassword("");
  }, [open, currentEmail]);

  async function handleSave() {
    const validation = validateEmailAddress(email);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    if (!currentPassword.trim()) {
      toast.error("Enter your current password.");
      return;
    }
    if (validation.value === currentEmail.trim().toLowerCase()) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave({ currentPassword, email: validation.value });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader
          title="Change email"
          description="Enter your current password to confirm this change."
        />
        <ResponsiveDialogBody className="space-y-3 py-0">
          <div className="grid gap-1.5">
            <label htmlFor="email-new" className="text-sm font-medium">
              New email
            </label>
            <Input
              id="email-new"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="email-current-password" className="text-sm font-medium">
              Current password
            </label>
            <Input
              id="email-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={saving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save email"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

interface EmailChangeRowProps {
  email: string;
  onSave: (values: { currentPassword: string; email: string }) => Promise<void> | void;
}

export function EmailChangeRow({ email, onSave }: EmailChangeRowProps) {
  const [open, setOpen] = useState(false);

  function openSheet() {
    setOpen(true);
  }

  return (
    <>
      <SettingsFieldRow
        label="Email"
        value={email}
        ariaLabel="Change email"
        onEdit={openSheet}
      />

      <EmailChangeSheet
        open={open}
        onOpenChange={setOpen}
        currentEmail={email}
        onSave={onSave}
      />
    </>
  );
}
