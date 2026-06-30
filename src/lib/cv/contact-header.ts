import type { ContactField, ContactLayout, ContactProfile } from "@/lib/types/cv";

export const DEFAULT_CONTACT_FIELDS: ContactField[] = [
  "EMAIL",
  "PHONE",
  "LOCATION",
  "WEBSITE",
];

export const CONTACT_FIELD_OPTIONS: { id: ContactField; label: string }[] = [
  { id: "EMAIL", label: "Email" },
  { id: "PHONE", label: "Phone" },
  { id: "LOCATION", label: "Location" },
  { id: "WEBSITE", label: "Website" },
  { id: "LINKEDIN", label: "LinkedIn" },
  { id: "GITHUB", label: "GitHub" },
];

export interface ResolvedContactField {
  field: ContactField;
  label: string;
  value: string;
  href?: string;
}

export function normalizeContactFields(fields: ContactField[] | undefined): ContactField[] {
  if (!fields?.length) return DEFAULT_CONTACT_FIELDS;
  const valid = new Set<ContactField>(CONTACT_FIELD_OPTIONS.map((o) => o.id));
  const out = fields.filter((f) => valid.has(f));
  return out.length > 0 ? out : DEFAULT_CONTACT_FIELDS;
}

function fieldLabel(field: ContactField): string {
  return CONTACT_FIELD_OPTIONS.find((o) => o.id === field)?.label ?? field;
}

function resolveFieldValue(
  profile: ContactProfile,
  field: ContactField
): { value: string; href?: string } | null {
  switch (field) {
    case "EMAIL": {
      const value = profile.email?.trim();
      return value ? { value, href: `mailto:${value}` } : null;
    }
    case "PHONE": {
      const value = profile.phone?.trim();
      return value ? { value, href: `tel:${value.replace(/\s/g, "")}` } : null;
    }
    case "LOCATION": {
      const value = profile.location?.trim();
      return value ? { value } : null;
    }
    case "WEBSITE": {
      const value = profile.website?.trim();
      if (!value) return null;
      const href = value.startsWith("http") ? value : `https://${value}`;
      return { value, href };
    }
    case "LINKEDIN": {
      const value = profile.linkedIn?.trim();
      if (!value) return null;
      const href = value.startsWith("http") ? value : `https://${value}`;
      return { value, href };
    }
    case "GITHUB": {
      const value = profile.github?.trim();
      if (!value) return null;
      const href = value.startsWith("http") ? value : `https://${value}`;
      return { value, href };
    }
    default:
      return null;
  }
}

export function resolveContactFields(
  profile: ContactProfile,
  fields: ContactField[] | undefined
): ResolvedContactField[] {
  const selected = normalizeContactFields(fields);
  const out: ResolvedContactField[] = [];
  for (const field of selected) {
    const resolved = resolveFieldValue(profile, field);
    if (!resolved) continue;
    out.push({
      field,
      label: fieldLabel(field),
      value: resolved.value,
      href: resolved.href,
    });
  }
  return out;
}

export function contactDetailsClassName(layout: ContactLayout | undefined): string {
  switch (layout) {
    case "STACKED":
      return "flex flex-col gap-1";
    case "ICON_LABEL":
      return "flex flex-col gap-1.5";
    default:
      return "flex flex-wrap gap-x-3 gap-y-1";
  }
}
