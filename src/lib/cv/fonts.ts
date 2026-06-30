import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";
import type { FontFamily } from "@/lib/types/cv";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--cv-font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--cv-font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--cv-font-mono",
});

export const DEFAULT_CV_FONT_FAMILY: FontFamily = "SANS";

export const CV_FONT_FAMILY_OPTIONS: { id: FontFamily; label: string }[] = [
  { id: "SANS", label: "Sans" },
  { id: "SERIF", label: "Serif" },
  { id: "MONO", label: "Mono" },
];

const CV_FONT_PRESETS = {
  SANS: inter,
  SERIF: sourceSerif,
  MONO: ibmPlexMono,
} as const;

/** Load all resume font CSS variables (apply on a preview ancestor). */
export const cvFontVariableClassNames = [
  inter.variable,
  sourceSerif.variable,
  ibmPlexMono.variable,
].join(" ");

export function normalizeFontFamily(value: string | undefined): FontFamily {
  if (value === "SERIF") return "SERIF";
  if (value === "MONO") return "MONO";
  return "SANS";
}

export function getCvFontFamilyClassName(fontFamily: FontFamily | undefined): string {
  return CV_FONT_PRESETS[normalizeFontFamily(fontFamily)].className;
}

export function getCvHeadingFontClassName(fontFamily: FontFamily | undefined): string {
  return getCvFontFamilyClassName(fontFamily);
}

export function getCvBodyFontClassName(fontFamily: FontFamily | undefined): string {
  return getCvFontFamilyClassName(fontFamily);
}
