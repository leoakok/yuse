import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site/metadata";

/** Standard OG / Twitter / Meta link-preview size. */
export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const OG_IMAGE_CONTENT_TYPE = "image/png";

export const OG_IMAGE_ALT =
  "Yuse. You are more than a one-page summary.";

const HERO_HEADLINE = "You are more than a one-page summary.";

/** Warm paper tone matching landing --background (approx oklch 0.98). */
const BACKGROUND = "#faf9f7";
const FOREGROUND = "#1c1917";

async function loadLogoDataUrl() {
  const bytes = await readFile(join(process.cwd(), "public/yuse-logo@2x.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/**
 * Landing-hero OG card: brand + Why headline only.
 * No nav CTAs (Go to app / Sign in), no scroll cue.
 */
export async function createLandingOgImage() {
  const logoSrc = await loadLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: BACKGROUND,
          color: FOREGROUND,
          padding: "72px 88px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <img
            src={logoSrc}
            width={72}
            height={72}
            alt=""
            style={{ borderRadius: 16 }}
          />
          <div
            style={{
              fontSize: 48,
              fontFamily: "Georgia, 'Times New Roman', serif",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            maxWidth: 920,
            fontSize: 72,
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {HERO_HEADLINE}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
    },
  );
}
