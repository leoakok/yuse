import type { PhotoPosition, PhotoSize } from "@/lib/types/cv";

export const DEFAULT_PHOTO_POSITION: PhotoPosition = "HEADER_LEFT";
export const DEFAULT_PHOTO_SIZE: PhotoSize = "M";

export function resolvePhotoSizePx(size: PhotoSize | undefined): number {
  switch (size) {
    case "XS":
      return 40;
    case "S":
      return 48;
    case "L":
      return 80;
    case "XL":
      return 96;
    default:
      return 64;
  }
}

export function isPhotoVisible(
  showPhoto: boolean,
  photoPosition: PhotoPosition | undefined,
  hasPhotoUrl: boolean
): boolean {
  if (!showPhoto || !hasPhotoUrl) return false;
  return (photoPosition ?? DEFAULT_PHOTO_POSITION) !== "NONE";
}

export function isSidebarPhoto(
  photoPosition: PhotoPosition | undefined,
  columnLayout: "SINGLE" | "TWO_COLUMN" | undefined
): boolean {
  return photoPosition === "SIDEBAR" && columnLayout === "TWO_COLUMN";
}

export function isHeaderPhoto(photoPosition: PhotoPosition | undefined): boolean {
  const pos = photoPosition ?? DEFAULT_PHOTO_POSITION;
  return pos === "HEADER_LEFT" || pos === "HEADER_RIGHT";
}
