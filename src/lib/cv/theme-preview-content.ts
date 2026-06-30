import type {
  ContactProfile,
  DesignPresetId,
  ResumeWithContent,
  Section,
  SectionItem,
  SectionType,
} from "@/lib/types/cv";
import { applyDesignPreset, getDesignPresetBundle, getDesignPresetLabel } from "@/lib/cv/design-presets";
import { defaultResumeSettings } from "@/lib/cv/resume-settings";
import type { CvTheme } from "@/lib/types/theme";

const PREVIEW_WORKSPACE = "theme-preview";
const PREVIEW_AT = "2026-01-01T00:00:00.000Z";
const PREVIEW_RESUME_ID = "theme-preview-resume";

function stubSection(id: string, type: SectionType, title: string): Section {
  return {
    id,
    workspaceId: PREVIEW_WORKSPACE,
    type,
    title,
    createdBy: "preview",
    createdAt: PREVIEW_AT,
    updatedAt: PREVIEW_AT,
  };
}

function stubItem(
  id: string,
  type: SectionType,
  headline: string,
  body: string,
  metadata: SectionItem["metadata"] = {}
): SectionItem {
  return {
    id,
    workspaceId: PREVIEW_WORKSPACE,
    type,
    headline,
    body,
    metadata,
    showInPreview: true,
    createdBy: "preview",
    createdAt: PREVIEW_AT,
    updatedAt: PREVIEW_AT,
  };
}

const PREVIEW_CONTACT: ContactProfile = {
  id: "preview-jane",
  workspaceId: PREVIEW_WORKSPACE,
  fullName: "Jane Doe",
  headline: "Marketing Director",
  email: "jane.doe@email.com",
  phone: "+1 (212) 555-0198",
  location: "New York, NY",
  website: "janedoe.com",
  linkedIn: "linkedin.com/in/janedoe",
  createdAt: PREVIEW_AT,
  updatedAt: PREVIEW_AT,
};

function previewSections(): Array<{ section: Section; items: SectionItem[] }> {
  return [
    {
      section: stubSection("preview-summary", "SUMMARY", "Summary"),
      items: [
        stubItem(
          "preview-summary-1",
          "SUMMARY",
          "",
          "Strategic marketing leader with 10 years driving brand growth, demand generation, and cross-functional launches for consumer and B2B companies."
        ),
      ],
    },
    {
      section: stubSection("preview-exp", "EXPERIENCE", "Experience"),
      items: [
        stubItem(
          "preview-exp-1",
          "EXPERIENCE",
          "Marketing Director",
          "Led integrated campaigns across brand, product marketing, and lifecycle.\n- Grew qualified pipeline 42% year over year.\n- Launched repositioning that lifted aided awareness 28 points.\n- Built a 12-person team across content, growth, and creative.",
          {
            company: "Harbor & Co.",
            startDate: "2020-01",
            endDate: "",
            location: "New York, NY",
          }
        ),
        stubItem(
          "preview-exp-2",
          "EXPERIENCE",
          "Senior Marketing Manager",
          "Owned go-to-market for two product lines from launch through scale.\n- Drove $4.2M in attributable revenue in year one.\n- Introduced marketing ops stack that cut reporting time 60%.",
          {
            company: "Lumen Health",
            startDate: "2016-04",
            endDate: "2019-12",
            location: "Boston, MA",
          }
        ),
      ],
    },
    {
      section: stubSection("preview-edu", "EDUCATION", "Education"),
      items: [
        stubItem(
          "preview-edu-1",
          "EDUCATION",
          "MBA, Marketing",
          "Dean's list. Case competition winner.",
          {
            institution: "Columbia Business School",
            startDate: "2014",
            endDate: "2016",
            location: "New York, NY",
          }
        ),
      ],
    },
    {
      section: stubSection("preview-skills", "SKILLS", "Skills"),
      items: [
        stubItem("preview-skill-1", "SKILLS", "Brand strategy", "", { level: "EXPERT" }),
        stubItem("preview-skill-2", "SKILLS", "Demand generation", "", { level: "EXPERT" }),
        stubItem("preview-skill-3", "SKILLS", "Product marketing", "", { level: "ADVANCED" }),
        stubItem("preview-skill-4", "SKILLS", "Content strategy", "", { level: "ADVANCED" }),
        stubItem("preview-skill-5", "SKILLS", "Marketing analytics", "", { level: "ADVANCED" }),
      ],
    },
    {
      section: stubSection("preview-cert", "CERTIFICATIONS", "Certifications"),
      items: [
        stubItem(
          "preview-cert-1",
          "CERTIFICATIONS",
          "Google Analytics Certification",
          "Professional certification in web analytics and measurement.",
          { startDate: "2023-05" }
        ),
      ],
    },
  ];
}

function themeForPreset(presetId: DesignPresetId): CvTheme {
  const bundle = getDesignPresetBundle(presetId);
  const label = getDesignPresetLabel(presetId);
  return {
    id: bundle.themeId,
    name: label,
    slug: presetId.toLowerCase(),
    isSystem: true,
    config: { fontFamily: bundle.fontFamily.toLowerCase() },
  };
}

export function buildThemePreviewContent(presetId: DesignPresetId): ResumeWithContent {
  const baseSettings = defaultResumeSettings(PREVIEW_RESUME_ID);
  const settings = {
    ...baseSettings,
    ...applyDesignPreset(baseSettings, presetId),
  };

  return {
    resume: {
      id: PREVIEW_RESUME_ID,
      workspaceId: PREVIEW_WORKSPACE,
      title: `${getDesignPresetLabel(presetId)} preview`,
      contactProfileId: PREVIEW_CONTACT.id,
      createdBy: "preview",
      createdAt: PREVIEW_AT,
      updatedAt: PREVIEW_AT,
    },
    contactProfile: PREVIEW_CONTACT,
    settings,
    theme: themeForPreset(presetId),
    sections: previewSections().map((entry) => ({ ...entry, showInPreview: true })),
  };
}
