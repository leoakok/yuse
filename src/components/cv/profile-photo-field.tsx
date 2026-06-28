"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadProfilePhoto, removeProfilePhoto } from "@/lib/api/cv-api";
import type { ResumeWithContent } from "@/lib/types/cv";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

function isAcceptedProfilePhoto(file: File): boolean {
  return ACCEPTED_PROFILE_PHOTO_TYPES.includes(
    file.type as (typeof ACCEPTED_PROFILE_PHOTO_TYPES)[number]
  );
}

interface ProfilePhotoFieldProps {
  resumeId: string;
  photoUrl?: string;
  disabled?: boolean;
  onUpdated: (content: ResumeWithContent) => void;
}

export function ProfilePhotoField({
  resumeId,
  photoUrl,
  disabled = false,
  onUpdated,
}: ProfilePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleFileSelected(file: File | undefined) {
    if (!file || disabled || isUploading || isRemoving) return;

    if (!isAcceptedProfilePhoto(file)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }

    setIsUploading(true);
    try {
      const updated = await uploadProfilePhoto(resumeId, file);
      onUpdated(updated);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Could not upload your photo. Check AWS settings and try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (disabled || isUploading || isRemoving || !photoUrl) return;
    setIsRemoving(true);
    try {
      const updated = await removeProfilePhoto(resumeId);
      onUpdated(updated);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove your photo. Try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  const busy = isUploading || isRemoving;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">Profile photo</label>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/40",
            !photoUrl && "text-muted-foreground"
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="size-6" aria-hidden />
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_PROFILE_PHOTO_TYPES.join(",")}
            className="sr-only"
            disabled={disabled || busy}
            onChange={(event) => void handleFileSelected(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {photoUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start px-0 text-muted-foreground hover:text-destructive"
              disabled={disabled || busy}
              onClick={() => void handleRemove()}
            >
              <Trash2 className="size-4" />
              Remove photo
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 5 MB.</p>
          )}
        </div>
      </div>
    </div>
  );
}
