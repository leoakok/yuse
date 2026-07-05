"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ContactProfile } from "@/lib/types/cv";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import { ResumeProfileEditDialog } from "@/components/cv/resume-profile-edit-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  workspaceRowClassName,
  workspaceSectionHeaderClassName,
  workspaceSectionTitleClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";
import type { ResumeWithContent } from "@/lib/types/cv";

interface ResumeProfileSectionProps {
  resumeId: string;
  contactProfile?: ContactProfile;
  onSaved: (content: ResumeWithContent) => void;
}

function contactDetailLines(profile?: ContactProfile): string[] {
  if (!profile) return [];
  return [
    profile.email,
    profile.phone,
    profile.location,
    profile.website,
    profile.linkedIn,
    profile.github,
  ].filter((value): value is string => Boolean(value));
}

export function ResumeProfileSection({
  resumeId,
  contactProfile,
  onSaved,
}: ResumeProfileSectionProps) {
  const [editOpen, setEditOpen] = useState(false);
  const details = contactDetailLines(contactProfile);
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  const hasContent =
    contactProfile?.fullName ||
    contactProfile?.headline ||
    photoUrl ||
    details.length > 0;

  function openEdit() {
    setEditOpen(true);
  }

  return (
    <>
      <section>
        <div className={workspaceSectionHeaderClassName}>
          <h2 className={workspaceSectionTitleClassName}>Profile</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-label="Edit profile"
            onClick={openEdit}
          >
            <Pencil />
          </Button>
        </div>
        <div
          className={cn(
            "group/profile relative cursor-pointer text-sm transition-colors",
            workspaceRowClassName,
            !hasContent && "text-muted-foreground"
          )}
          onClick={openEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openEdit();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Edit profile"
        >
          {hasContent ? (
            <div className="flex min-w-0 items-start gap-3">
              {photoUrl ? (
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={photoUrl} alt="" />
                  <AvatarFallback />
                </Avatar>
              ) : null}
              <div className="min-w-0">
                {contactProfile?.fullName ? (
                  <p className="font-medium">{contactProfile.fullName}</p>
                ) : null}
                {contactProfile?.headline ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{contactProfile.headline}</p>
                ) : null}
                {details.length > 0 ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {details.join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs">Add your name and contact details</p>
          )}
        </div>
      </section>

      <ResumeProfileEditDialog
        resumeId={resumeId}
        contactProfile={contactProfile}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onSaved}
      />
    </>
  );
}
