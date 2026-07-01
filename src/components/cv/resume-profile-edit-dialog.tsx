"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ContactProfile, ResumeWithContent } from "@/lib/types/cv";
import { updateContactProfile } from "@/lib/api/cv-api";
import { ProfilePhotoField } from "@/components/cv/profile-photo-field";
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

interface ProfileFormState {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedIn: string;
  github: string;
}

function emptyFormState(): ProfileFormState {
  return {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedIn: "",
    github: "",
  };
}

function formStateFromProfile(profile?: ContactProfile): ProfileFormState {
  if (!profile) return emptyFormState();
  return {
    fullName: profile.fullName,
    headline: profile.headline ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    website: profile.website ?? "",
    linkedIn: profile.linkedIn ?? "",
    github: profile.github ?? "",
  };
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

interface ResumeProfileEditDialogProps {
  resumeId: string;
  contactProfile?: ContactProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (content: ResumeWithContent) => void;
}

export function ResumeProfileEditDialog({
  resumeId,
  contactProfile,
  open,
  onOpenChange,
  onSaved,
}: ResumeProfileEditDialogProps) {
  const [form, setForm] = useState<ProfileFormState>(emptyFormState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyFormState());
      return;
    }
    setForm(formStateFromProfile(contactProfile));
  }, [open, contactProfile]);

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateContactProfile(resumeId, {
        fullName: form.fullName,
        headline: form.headline,
        email: form.email,
        phone: form.phone,
        location: form.location,
        website: form.website,
        linkedIn: form.linkedIn,
        github: form.github,
      });
      onSaved(updated);
      onOpenChange(false);
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save your profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Your name and contact details appear at the top of the resume preview.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <ProfilePhotoField
            resumeId={resumeId}
            photoUrl={contactProfile?.photoUrl}
            disabled={isSaving}
            onUpdated={onSaved}
          />
          <FieldGroup label="Full name">
            <Input
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Alex Morgan"
            />
          </FieldGroup>
          <FieldGroup label="Job title">
            <Input
              value={form.headline}
              onChange={(e) => updateField("headline", e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </FieldGroup>
          <FieldGroup label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="alex@example.com"
            />
          </FieldGroup>
          <FieldGroup label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+1 555 0100"
            />
          </FieldGroup>
          <FieldGroup label="Location">
            <Input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="San Francisco, CA"
            />
          </FieldGroup>
          <FieldGroup label="Website">
            <Input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://example.com"
            />
          </FieldGroup>
          <FieldGroup label="LinkedIn">
            <Input
              value={form.linkedIn}
              onChange={(e) => updateField("linkedIn", e.target.value)}
              placeholder="linkedin.com/in/you"
            />
          </FieldGroup>
          <FieldGroup label="GitHub">
            <Input
              value={form.github}
              onChange={(e) => updateField("github", e.target.value)}
              placeholder="github.com/you"
            />
          </FieldGroup>
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
