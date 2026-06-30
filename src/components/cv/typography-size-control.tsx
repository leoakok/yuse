"use client";

import type { CvFontSize } from "@/lib/types/cv";
import {
  FONT_SIZE_ORDER,
  formatTypographySettingLabel,
  type CvTypographySettings,
} from "@/lib/cv/typography";
import { DiscreteSlider } from "@/components/cv/discrete-slider";

const FONT_SIZE_STEPS = FONT_SIZE_ORDER.map((value) => ({ value }));

interface TypographySizeControlProps {
  label: string;
  settingKey: keyof CvTypographySettings;
  value: CvFontSize;
  typography: CvTypographySettings;
  onChange: (value: CvFontSize) => void;
}

export function TypographySizeControl({
  label,
  settingKey,
  value,
  typography,
  onChange,
}: TypographySizeControlProps) {
  const valueLabel = formatTypographySettingLabel(settingKey, {
    ...typography,
    [settingKey]: value,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold leading-none">{label}</span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{valueLabel}</span>
      </div>
      <DiscreteSlider
        layout="segmented"
        steps={FONT_SIZE_STEPS}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
