"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ContactProfile } from "@/lib/types/portfolio";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import { PortfolioProfileEditDialog } from "@/components/portfolio/portfolio-profile-edit-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PortfolioWithContent } from "@/lib/types/portfolio";

interface PortfolioProfileSectionProps {
  portfolioId: string;
  contactProfile?: ContactProfile;
  onSaved: (content: PortfolioWithContent) => void;
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

export function PortfolioProfileSection({
  portfolioId,
  contactProfile,
  onSaved,
}: PortfolioProfileSectionProps) {
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
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:px-5">
          <h2 className="min-w-0 text-sm font-semibold">Profile</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={openEdit}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </div>
        <div
          className={cn(
            "group/profile relative cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-muted/40 lg:px-5",
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

      <PortfolioProfileEditDialog
        portfolioId={portfolioId}
        contactProfile={contactProfile}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onSaved}
      />
    </>
  );
}
