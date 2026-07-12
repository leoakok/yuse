"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LINKEDIN_TIME_PRESETS,
  labelForLinkedInTimeFilter,
  parseLinkedInTimeFilter,
} from "@/lib/admin/linkedin-time-filter";

const CUSTOM_VALUE = "__custom__";

type LinkedInTimeFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LinkedInTimeFilter({ value, onChange }: LinkedInTimeFilterProps) {
  const isPreset = (next: string) => LINKEDIN_TIME_PRESETS.some((item) => item.value === next);
  const [mode, setMode] = useState(() => (isPreset(value) ? value : CUSTOM_VALUE));
  const [customInput, setCustomInput] = useState(() => (isPreset(value) ? "" : value.replace(/^r/i, "")));

  useEffect(() => {
    if (isPreset(value)) {
      setMode(value);
      return;
    }
    setMode(CUSTOM_VALUE);
    setCustomInput(value.replace(/^r/i, ""));
  }, [value]);

  function applyCustom(next: string) {
    setCustomInput(next);
    const trimmed = next.trim();
    if (!trimmed) return;
    try {
      onChange(parseLinkedInTimeFilter(trimmed));
    } catch {
      // Keep draft until valid on blur/search.
    }
  }

  const triggerLabel =
    mode === CUSTOM_VALUE ? labelForLinkedInTimeFilter(value) : labelForLinkedInTimeFilter(mode);

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={mode}
        onValueChange={(next) => {
          if (!next) return;
          if (next === CUSTOM_VALUE) {
            setMode(CUSTOM_VALUE);
            if (customInput.trim()) {
              applyCustom(customInput);
            }
            return;
          }
          setMode(next);
          onChange(next);
        }}
      >
        <SelectTrigger className="h-8 w-32 text-sm">
          <SelectValue>{triggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LINKEDIN_TIME_PRESETS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>Custom...</SelectItem>
        </SelectContent>
      </Select>

      {mode === CUSTOM_VALUE ? (
        <Input
          value={customInput}
          onChange={(event) => applyCustom(event.target.value)}
          onBlur={() => {
            if (!customInput.trim()) return;
            try {
              onChange(parseLinkedInTimeFilter(customInput));
            } catch {
              // Parent search will surface invalid values if needed.
            }
          }}
          placeholder="15m, 1h, 1800"
          className="h-8 w-32 text-sm"
        />
      ) : null}
    </div>
  );
}
