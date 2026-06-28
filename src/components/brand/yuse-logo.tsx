import {
  YuseLogoA,
  YuseLogoB,
  YuseLogoC,
  type LogoBaseProps,
  type YuseLogoVariant,
} from "@/components/brand/yuse-logo-options";

export type { YuseLogoVariant };
export { YuseLogoA, YuseLogoB, YuseLogoC };

export type YuseLogoProps = LogoBaseProps & {
  /** Logo concept variant — defaults to mascot mark (Option C). */
  variant?: YuseLogoVariant;
};

/** Rounded mascot slingshot with briefcase — default Yuse mark. */
export function YuseLogo({ variant = "c", ...props }: YuseLogoProps) {
  if (variant === "a") {
    return <YuseLogoA {...props} />;
  }
  if (variant === "b") {
    return <YuseLogoB {...props} />;
  }
  return <YuseLogoC {...props} />;
}
