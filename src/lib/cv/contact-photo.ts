import type { ContactProfile } from "@/lib/types/cv";

/** Uploaded photo, then LinkedIn, then GitHub. */
export function effectiveContactPhotoUrl(
  profile?: Pick<ContactProfile, "photoUrl" | "linkedinPhotoUrl" | "githubPhotoUrl" | "effectivePhotoUrl">
): string | undefined {
  if (!profile) return undefined;
  const fromApi = profile.effectivePhotoUrl?.trim();
  if (fromApi) return fromApi;
  return (
    profile.photoUrl?.trim() ||
    profile.linkedinPhotoUrl?.trim() ||
    profile.githubPhotoUrl?.trim() ||
    undefined
  );
}
