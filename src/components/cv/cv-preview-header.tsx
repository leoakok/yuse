"use client";

import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type {
  ColumnLayout,
  ContactField,
  ContactLayout,
  ContactProfile,
  PhotoPosition,
  PhotoSize,
} from "@/lib/types/cv";
import {
  contactDetailsClassName,
  resolveContactFields,
  type ResolvedContactField,
} from "@/lib/cv/contact-header";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import {
  DEFAULT_PHOTO_POSITION,
  isHeaderPhoto,
  isPhotoVisible,
  isSidebarPhoto,
  resolvePhotoSizePx,
} from "@/lib/cv/photo";
import type { CvTypography } from "@/lib/cv/typography";
import { cn } from "@/lib/utils";

const FIELD_ICONS: Partial<Record<ContactField, typeof Mail>> = {
  EMAIL: Mail,
  PHONE: Phone,
  LOCATION: MapPin,
  WEBSITE: Globe,
};

function ContactFieldRow({
  entry,
  layout,
  accentColor,
  detailsPx,
  textMuted,
  interactive = true,
}: {
  entry: ResolvedContactField;
  layout: ContactLayout;
  accentColor: string;
  detailsPx: number;
  textMuted?: string;
  interactive?: boolean;
}) {
  const linkStyle = { color: accentColor };
  const style = { fontSize: `${detailsPx}px` };

  if (layout === "ICON_LABEL") {
    const Icon = FIELD_ICONS[entry.field];
    const content =
      entry.href && interactive ? (
        <a href={entry.href} className="truncate hover:underline" style={linkStyle}>
          {entry.value}
        </a>
      ) : (
        <span className="truncate" style={entry.href ? linkStyle : undefined}>
          {entry.value}
        </span>
      );
    return (
      <div
        className="flex min-w-0 items-center gap-2"
        style={{ ...style, color: textMuted }}
      >
        {Icon ? (
          <Icon className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <span className="w-3.5 shrink-0 text-center text-[9px] font-semibold uppercase" aria-hidden>
            {entry.field === "LINKEDIN" ? "in" : entry.field === "GITHUB" ? "gh" : entry.label.slice(0, 2)}
          </span>
        )}
        {content}
      </div>
    );
  }

  const content =
    entry.href && interactive ? (
      <a href={entry.href} className="hover:underline" style={linkStyle}>
        {entry.value}
      </a>
    ) : (
      <span style={entry.href ? linkStyle : undefined}>{entry.value}</span>
    );

  return (
    <span style={{ ...style, color: textMuted }}>
      {content}
    </span>
  );
}

export function CvPreviewPhoto({
  contactProfile,
  photoPosition,
  photoSize,
  showPhoto,
  accentColor,
  className,
}: {
  contactProfile: ContactProfile;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  showPhoto: boolean;
  accentColor: string;
  className?: string;
}) {
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  if (!isPhotoVisible(showPhoto, photoPosition, Boolean(photoUrl))) return null;

  const sizePx = resolvePhotoSizePx(photoSize);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl!}
      alt=""
      className={cn("shrink-0 rounded-full object-cover ring-2", className)}
      style={{
        width: sizePx,
        height: sizePx,
        boxShadow: `0 0 0 1px ${accentColor}33`,
      }}
    />
  );
}

export function CvPreviewHeader({
  contactProfile,
  showPhoto = false,
  photoPosition = DEFAULT_PHOTO_POSITION,
  photoSize = "M",
  contactLayout = "INLINE",
  contactFields,
  columnLayout = "SINGLE",
  typography,
  accentColor,
  nameFontWeight,
  headingFontClassName,
  textMuted,
  interactive = true,
}: {
  contactProfile: ContactProfile;
  showPhoto?: boolean;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
  contactLayout?: ContactLayout;
  contactFields?: ContactField[];
  columnLayout?: ColumnLayout;
  typography: CvTypography;
  accentColor: string;
  nameFontWeight?: number;
  headingFontClassName?: string;
  textMuted?: string;
  interactive?: boolean;
}) {
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  const showHeaderPhoto =
    isPhotoVisible(showPhoto, photoPosition, Boolean(photoUrl)) &&
    isHeaderPhoto(photoPosition) &&
    !isSidebarPhoto(photoPosition, columnLayout);
  const photoOnLeft = (photoPosition ?? DEFAULT_PHOTO_POSITION) !== "HEADER_RIGHT";
  const fields = resolveContactFields(contactProfile, contactFields);

  const photo = showHeaderPhoto ? (
    <CvPreviewPhoto
      contactProfile={contactProfile}
      photoPosition={photoPosition ?? DEFAULT_PHOTO_POSITION}
      photoSize={photoSize ?? "M"}
      showPhoto={showPhoto}
      accentColor={accentColor}
    />
  ) : null;

  return (
    <header className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div
        className={cn(
          "flex gap-4",
          showHeaderPhoto ? "items-start" : undefined,
          showHeaderPhoto && !photoOnLeft ? "flex-row-reverse" : undefined
        )}
      >
        {photo}
        <div className="min-w-0 flex-1">
          <h1
            className={cn("tracking-tight", headingFontClassName)}
            style={{
              fontSize: `${typography.contactNamePx}px`,
              fontWeight: nameFontWeight ?? 700,
            }}
          >
            {contactProfile.fullName}
          </h1>
          {contactProfile.headline ? (
            <p
              className="mt-1"
              style={{
                fontSize: `${typography.contactHeadlinePx}px`,
                color: textMuted ?? undefined,
              }}
            >
              {contactProfile.headline}
            </p>
          ) : null}
          {fields.length > 0 ? (
            <div
              className={cn("mt-2", contactDetailsClassName(contactLayout))}
            >
              {fields.map((entry) => (
                <ContactFieldRow
                  key={entry.field}
                  entry={entry}
                  layout={contactLayout ?? "INLINE"}
                  accentColor={accentColor}
                  detailsPx={typography.contactDetailsPx}
                  textMuted={textMuted}
                  interactive={interactive}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function CvPreviewSidebarPhoto({
  contactProfile,
  showPhoto,
  photoPosition,
  photoSize,
  columnLayout,
  accentColor,
}: {
  contactProfile: ContactProfile;
  showPhoto: boolean;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  columnLayout: ColumnLayout;
  accentColor: string;
}) {
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  if (!isSidebarPhoto(photoPosition, columnLayout)) return null;
  if (!isPhotoVisible(showPhoto, photoPosition, Boolean(photoUrl))) return null;

  return (
    <div className="mb-4 flex justify-center">
      <CvPreviewPhoto
        contactProfile={contactProfile}
        photoPosition={photoPosition}
        photoSize={photoSize}
        showPhoto={showPhoto}
        accentColor={accentColor}
      />
    </div>
  );
}
