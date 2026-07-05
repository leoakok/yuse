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

const MIN_PASSWORD_LENGTH = 8;

export type PasswordChangeValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

interface PasswordChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PasswordChangeValues) => Promise<void> | void;
}

function validatePasswordChange(values: PasswordChangeValues): string | null {
  if (!values.currentPassword.trim()) {
    return "Enter your current password.";
  }
  if (!values.newPassword) {
    return "Enter a new password.";
  }
  if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (values.newPassword !== values.confirmPassword) {
    return "New passwords do not match.";
  }
  if (values.newPassword === values.currentPassword) {
    return "Choose a different password than your current one.";
  }
  return null;
}

export function PasswordChangeSheet({
  open,
  onOpenChange,
  onSave,
}: PasswordChangeSheetProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open]);

  async function handleSave() {
    const values = { currentPassword, newPassword, confirmPassword };
    const error = validatePasswordChange(values);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader
          title="Change password"
          description="Enter your current password, then choose a new one."
        />
        <ResponsiveDialogBody className="space-y-3 py-0">
          <div className="grid gap-1.5">
            <label htmlFor="password-current" className="text-sm font-medium">
              Current password
            </label>
            <Input
              id="password-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password-new" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="password-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password-confirm" className="text-sm font-medium">
              Confirm new password
            </label>
            <Input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {saving ? "Saving…" : "Save password"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

interface PasswordChangeRowProps {
  onSave: (values: PasswordChangeValues) => Promise<void> | void;
}

export function PasswordChangeRow({ onSave }: PasswordChangeRowProps) {
  const [open, setOpen] = useState(false);

  function openSheet() {
    setOpen(true);
  }

  return (
    <>
      <SettingsFieldRow
        label="Password"
        value="••••••••"
        ariaLabel="Change password"
        onEdit={openSheet}
      />

      <PasswordChangeSheet open={open} onOpenChange={setOpen} onSave={onSave} />
    </>
  );
}
