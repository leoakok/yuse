"use client";

import type {
  BulletChar,
  CertificationsLayout,
  DescriptionStyle,
  FontWeightRole,
  FooterStyle,
  ItemTitleEmphasis,
  LanguagesLayout,
  LetterSpacingDensity,
  LineHeightDensity,
  LocationDisplay,
  SectionTitleCase,
  SkillsProficiency,
  SpacingDensity,
} from "@/lib/types/cv";
import { CV_FONT_FAMILY_OPTIONS } from "@/lib/cv/fonts";
import type { ResumeDesignExtensionFields } from "@/lib/cv/resume-design";
import { cn } from "@/lib/utils";

function OptionPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "min-w-[4.5rem] flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
            value === option.id
              ? "border-primary bg-primary/5 font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SPACING_OPTIONS: { id: SpacingDensity; label: string }[] = [
  { id: "COMPACT", label: "Compact" },
  { id: "NORMAL", label: "Normal" },
  { id: "AIRY", label: "Airy" },
];

const DESCRIPTION_OPTIONS: { id: DescriptionStyle; label: string }[] = [
  { id: "BULLETS", label: "Bullets" },
  { id: "PARAGRAPH", label: "Paragraph" },
];

const BULLET_OPTIONS: { id: BulletChar; label: string }[] = [
  { id: "DOT", label: "Dot" },
  { id: "DASH", label: "Dash" },
  { id: "CHECK", label: "Check" },
];

const EMPHASIS_OPTIONS: { id: ItemTitleEmphasis; label: string }[] = [
  { id: "TITLE", label: "Title" },
  { id: "COMPANY", label: "Company" },
];

const LOCATION_OPTIONS: { id: LocationDisplay; label: string }[] = [
  { id: "HIDDEN", label: "Hidden" },
  { id: "OWN_LINE", label: "Own line" },
  { id: "INLINE_WITH_COMPANY", label: "Inline" },
];

const WEIGHT_OPTIONS: { id: FontWeightRole; label: string }[] = [
  { id: "LIGHT", label: "Light" },
  { id: "REGULAR", label: "Regular" },
  { id: "MEDIUM", label: "Medium" },
  { id: "SEMIBOLD", label: "Semibold" },
];

const LINE_HEIGHT_OPTIONS: { id: LineHeightDensity; label: string }[] = [
  { id: "TIGHT", label: "Tight" },
  { id: "NORMAL", label: "Normal" },
  { id: "RELAXED", label: "Relaxed" },
];

const LETTER_SPACING_OPTIONS: { id: LetterSpacingDensity; label: string }[] = [
  { id: "TIGHT", label: "Tight" },
  { id: "NORMAL", label: "Normal" },
];

const SECTION_TITLE_CASE_OPTIONS: { id: SectionTitleCase; label: string }[] = [
  { id: "UPPERCASE", label: "Uppercase" },
  { id: "CAPITALIZE", label: "Capitalize" },
];

const SKILLS_PROF_OPTIONS: { id: SkillsProficiency; label: string }[] = [
  { id: "NONE", label: "None" },
  { id: "DOTS", label: "Dots" },
  { id: "BARS", label: "Bars" },
  { id: "TEXT", label: "Text" },
];

const LANGUAGES_LAYOUT_OPTIONS: { id: LanguagesLayout; label: string }[] = [
  { id: "LIST", label: "List" },
  { id: "INLINE", label: "Inline" },
  { id: "COLUMNS", label: "Columns" },
];

const CERT_LAYOUT_OPTIONS: { id: CertificationsLayout; label: string }[] = [
  { id: "LIST", label: "List" },
  { id: "COMPACT", label: "Compact" },
  { id: "DETAILED", label: "Detailed" },
];

const FOOTER_OPTIONS: { id: FooterStyle; label: string }[] = [
  { id: "NONE", label: "None" },
  { id: "PAGE_NUMBER", label: "Page #" },
  { id: "NAME_AND_PAGE", label: "Name + #" },
];

export interface ResumeDesignExtensionPanelProps {
  values: ResumeDesignExtensionFields;
  onChange: (patch: Partial<ResumeDesignExtensionFields>) => void;
  atsMode?: boolean;
  onAtsModeChange?: (enabled: boolean) => void;
}

export function ResumeSpacingItemsSettings({
  values,
  onChange,
}: Pick<ResumeDesignExtensionPanelProps, "values" | "onChange">) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Between sections</p>
          <OptionPills
            options={SPACING_OPTIONS}
            value={values.sectionSpacing}
            onChange={(sectionSpacing) => onChange({ sectionSpacing })}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Between entries</p>
          <OptionPills
            options={SPACING_OPTIONS}
            value={values.itemSpacing}
            onChange={(itemSpacing) => onChange({ itemSpacing })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Description style</p>
          <OptionPills
            options={DESCRIPTION_OPTIONS}
            value={values.descriptionStyle}
            onChange={(descriptionStyle) => onChange({ descriptionStyle })}
          />
        </div>
        {values.descriptionStyle === "BULLETS" ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Bullet style</p>
            <OptionPills
              options={BULLET_OPTIONS}
              value={values.bulletChar}
              onChange={(bulletChar) => onChange({ bulletChar })}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Bold emphasis</p>
          <OptionPills
            options={EMPHASIS_OPTIONS}
            value={values.itemTitleEmphasis}
            onChange={(itemTitleEmphasis) => onChange({ itemTitleEmphasis })}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Location</p>
          <OptionPills
            options={LOCATION_OPTIONS}
            value={values.locationDisplay}
            onChange={(locationDisplay) => onChange({ locationDisplay })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={values.highlightCurrentRole}
            onChange={(e) => onChange({ highlightCurrentRole: e.target.checked })}
            className="size-3.5 rounded border"
          />
          Highlight current role
        </label>
      </div>
    </div>
  );
}

export function ResumeTypeDepthSettings({
  values,
  onChange,
}: Pick<ResumeDesignExtensionPanelProps, "values" | "onChange">) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Heading font</p>
        <OptionPills
          options={CV_FONT_FAMILY_OPTIONS}
          value={values.headingFontFamily}
          onChange={(headingFontFamily) => onChange({ headingFontFamily })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Body font</p>
        <OptionPills
          options={CV_FONT_FAMILY_OPTIONS}
          value={values.bodyFontFamily}
          onChange={(bodyFontFamily) => onChange({ bodyFontFamily })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Name weight</p>
        <OptionPills
          options={WEIGHT_OPTIONS}
          value={values.nameFontWeight}
          onChange={(nameFontWeight) => onChange({ nameFontWeight })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Section title weight</p>
        <OptionPills
          options={WEIGHT_OPTIONS}
          value={values.sectionTitleFontWeight}
          onChange={(sectionTitleFontWeight) => onChange({ sectionTitleFontWeight })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Line height</p>
        <OptionPills
          options={LINE_HEIGHT_OPTIONS}
          value={values.lineHeight}
          onChange={(lineHeight) => onChange({ lineHeight })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Heading letter spacing</p>
        <OptionPills
          options={LETTER_SPACING_OPTIONS}
          value={values.headingLetterSpacing}
          onChange={(headingLetterSpacing) => onChange({ headingLetterSpacing })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Section title case</p>
        <OptionPills
          options={SECTION_TITLE_CASE_OPTIONS}
          value={values.sectionTitleCase}
          onChange={(sectionTitleCase) => onChange({ sectionTitleCase })}
        />
      </div>
    </div>
  );
}

export function ResumeSectionDepthSettings({
  values,
  onChange,
}: Pick<ResumeDesignExtensionPanelProps, "values" | "onChange">) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Skills proficiency</p>
        <OptionPills
          options={SKILLS_PROF_OPTIONS}
          value={values.skillsProficiency}
          onChange={(skillsProficiency) => onChange({ skillsProficiency })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Languages layout</p>
        <OptionPills
          options={LANGUAGES_LAYOUT_OPTIONS}
          value={values.languagesLayout}
          onChange={(languagesLayout) => onChange({ languagesLayout })}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Certifications layout</p>
        <OptionPills
          options={CERT_LAYOUT_OPTIONS}
          value={values.certificationsLayout}
          onChange={(certificationsLayout) => onChange({ certificationsLayout })}
        />
      </div>
    </div>
  );
}

export function ResumeExportAtsSettings({
  values,
  onChange,
  atsMode = false,
  onAtsModeChange,
}: Pick<
  ResumeDesignExtensionPanelProps,
  "values" | "onChange" | "atsMode" | "onAtsModeChange"
>) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={atsMode}
          onChange={(e) => onAtsModeChange?.(e.target.checked)}
          className="size-3.5 rounded border"
        />
        ATS-safe mode
      </label>
      <p className="text-[11px] text-muted-foreground">
        Simplifies layout for applicant tracking systems: no photo, accent, or decorative
        styling.
      </p>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Footer</p>
        <OptionPills
          options={FOOTER_OPTIONS}
          value={values.footerStyle}
          onChange={(footerStyle) => onChange({ footerStyle })}
        />
      </div>
    </div>
  );
}
