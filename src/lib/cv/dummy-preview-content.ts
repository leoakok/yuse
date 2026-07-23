import type {
  ContactProfile,
  ResumeWithContent,
  Section,
  SectionItem,
  SectionType,
} from "@/lib/types/cv";
import type { CvTheme } from "@/lib/types/theme";
import type { ResumeSettings } from "@/lib/types/cv";

const PREVIEW_WORKSPACE = "design-preview";
const PREVIEW_AT = "2026-01-01T00:00:00.000Z";

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
  metadata: SectionItem["metadata"] = {},
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

const JOHN_DOE_CONTACT: ContactProfile = {
  id: "preview-john",
  workspaceId: PREVIEW_WORKSPACE,
  fullName: "John Doe",
  headline: "Marketing Director",
  email: "john.doe@email.com",
  phone: "+1 (212) 555-0198",
  location: "New York, NY",
  website: "johndoe.com",
  linkedIn: "linkedin.com/in/johndoe",
  createdAt: PREVIEW_AT,
  updatedAt: PREVIEW_AT,
};

function dummySections(): Array<{ section: Section; items: SectionItem[] }> {
  return [
    {
      section: stubSection("preview-summary", "SUMMARY", "Summary"),
      items: [
        stubItem(
          "preview-summary-1",
          "SUMMARY",
          "",
          "Strategic marketing leader with 10 years driving brand growth, demand generation, and cross-functional launches for consumer and B2B companies.",
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
          },
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
          },
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
      ],
    },
  ];
}

/** Build preview content with John Doe sample data and the given design settings. */
export function buildDummyPreviewContent(
  settings: ResumeSettings,
  theme: CvTheme,
  resumeId = "design-preview-resume",
): ResumeWithContent {
  return {
    resume: {
      id: resumeId,
      workspaceId: PREVIEW_WORKSPACE,
      title: "Design preview",
      contactProfileId: JOHN_DOE_CONTACT.id,
      createdBy: "preview",
      createdAt: PREVIEW_AT,
      updatedAt: PREVIEW_AT,
    },
    contactProfile: JOHN_DOE_CONTACT,
    settings: { ...settings, resumeId },
    theme,
    sections: dummySections().map((entry) => ({ ...entry, showInPreview: true })),
  };
}

export { JOHN_DOE_CONTACT, dummySections, PREVIEW_AT, PREVIEW_WORKSPACE };
