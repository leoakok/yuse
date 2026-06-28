import { useId, type ImgHTMLAttributes, type SVGProps } from "react";
import { cn } from "@/lib/utils";

export type LogoBaseProps = {
  className?: string;
  size?: number;
  monochrome?: boolean;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  role?: string;
};

type LogoSvgOptionProps = LogoBaseProps &
  Omit<SVGProps<SVGSVGElement>, keyof LogoBaseProps>;

type LogoImgOptionProps = LogoBaseProps &
  Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    keyof LogoBaseProps | "src" | "width" | "height" | "alt"
  >;

const YUSE_LOGO_PNG = "/yuse-logo.png";
const YUSE_LOGO_PNG_2X = "/yuse-logo@2x.png";

function accentDefs(uid: string, monochrome: boolean) {
  if (monochrome) return null;
  const accentId = `yuse-accent-${uid}`;
  return (
    <defs>
      <linearGradient id={accentId} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
  );
}

function accentFill(uid: string, monochrome: boolean) {
  return monochrome ? "currentColor" : `url(#yuse-accent-${uid})`;
}

function accentOpacity(monochrome: boolean) {
  return monochrome ? 0.55 : 1;
}

/** Option A — literal Y-fork slingshot with elastic, pouch, and stone. */
export function YuseLogoA({
  className,
  size,
  style,
  monochrome = false,
  ...props
}: LogoSvgOptionProps) {
  const uid = useId().replace(/:/g, "");
  const fill = accentFill(uid, monochrome);
  const opacity = accentOpacity(monochrome);

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
      style={size != null ? { width: size, height: size, ...style } : style}
      {...props}
    >
      {accentDefs(uid, monochrome)}
      <path
        d="M16 29.5 C14.8 29.5 14 28.8 14 27.5 V17.2 L5.2 4.2 C4.2 2.6 5.4 1.2 7 2 L13.8 14.2 V17.2 H14 V27.5 C14 28.8 13.2 29.5 12 29.5 H16 Z"
        fill="currentColor"
      />
      <path
        d="M16 29.5 C17.2 29.5 18 28.8 18 27.5 V17.2 L26.8 4.2 C27.8 2.6 26.6 1.2 25 2 L18.2 14.2 V17.2 H18 V27.5 C18 28.8 18.8 29.5 20 29.5 H16 Z"
        fill="currentColor"
      />
      <path
        d="M7.5 6.5 L6.8 10.5 M10 8 L9.2 12 M24.5 6.5 L25.2 10.5 M22 8 L22.8 12"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity={0.28}
      />
      <circle cx="6.5" cy="3.2" r="2.2" fill="currentColor" />
      <circle cx="25.5" cy="3.2" r="2.2" fill="currentColor" />
      <path
        d="M7 4.5 C7 11 10.5 15.5 16 16.8 C21.5 15.5 25 11 25 4.5 L22.5 5.5 C22.5 10.5 19.5 13.5 16 14.5 C12.5 13.5 9.5 10.5 9.5 5.5 Z"
        fill={fill}
        opacity={opacity}
      />
      <path
        d="M11.5 15.8 Q16 21 20.5 15.8 Q16 18.2 11.5 15.8 Z"
        fill={fill}
        opacity={opacity}
      />
      <circle cx="16" cy="16.2" r="2" fill="currentColor" opacity={0.85} />
    </svg>
  );
}

/** Option B — bold letter Y where fork arms connect via an elastic band. */
export function YuseLogoB({
  className,
  size,
  style,
  monochrome = false,
  ...props
}: LogoSvgOptionProps) {
  const uid = useId().replace(/:/g, "");
  const fill = accentFill(uid, monochrome);
  const opacity = accentOpacity(monochrome);

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
      style={size != null ? { width: size, height: size, ...style } : style}
      {...props}
    >
      {accentDefs(uid, monochrome)}
      <path
        d="M7 5.5 L16 17.5 L25 5.5 M16 17.5 L16 27.5"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="5.5" r="2.8" fill="currentColor" />
      <circle cx="25" cy="5.5" r="2.8" fill="currentColor" />
      <path
        d="M8.5 5 C8.5 9.5 12 12.5 16 13 C20 12.5 23.5 9.5 23.5 5"
        stroke={fill}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
      <rect x="14.5" y="24" width="3" height="2.5" rx="0.8" fill="currentColor" opacity={0.35} />
    </svg>
  );
}

/** Option C — rounded mascot slingshot with briefcase (PNG, app-icon friendly). */
export function YuseLogoC({
  className,
  size,
  style,
  monochrome = false,
  ...props
}: LogoImgOptionProps) {
  return (
    <img
      src={YUSE_LOGO_PNG}
      srcSet={`${YUSE_LOGO_PNG} 1x, ${YUSE_LOGO_PNG_2X} 2x`}
      alt=""
      aria-hidden
      className={cn(
        "shrink-0",
        monochrome && "brightness-0 opacity-55",
        className,
      )}
      style={size != null ? { width: size, height: size, ...style } : style}
      {...props}
    />
  );
}

export type YuseLogoVariant = "a" | "b" | "c";

export const YUSE_LOGO_OPTIONS = [
  {
    id: "a" as const,
    label: "Option A",
    title: "Literal slingshot",
    description:
      "Classic Y-fork frame with wood-grain detail, elastic band, pouch, and stone. Reads unmistakably as a slingshot.",
    Component: YuseLogoA,
    png: "/logo-options/option-a.png",
    svg: "/logo-options/option-a.svg",
  },
  {
    id: "b" as const,
    label: "Option B",
    title: "Letter Y slingshot",
    description:
      "Bold geometric Y where the arms are fork prongs and an amber band connects the tips. Minimal and typographic.",
    Component: YuseLogoB,
    png: "/logo-options/option-b.png",
    svg: "/logo-options/option-b.svg",
  },
  {
    id: "c" as const,
    label: "Option C",
    title: "Mascot mark",
    description:
      "Rounded, friendly slingshot with a smile and briefcase. App-icon friendly with bold fills.",
    Component: YuseLogoC,
    png: "/logo-options/option-c.png",
    svg: "/logo-options/option-c.svg",
  },
] as const;
