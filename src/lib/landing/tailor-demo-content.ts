import type {
  ContactProfile,
  ResumeWithContent,
  Section,
  SectionItem,
  SectionType,
} from "@/lib/types/cv";
import type { CvTheme } from "@/lib/types/theme";

const DEMO_WORKSPACE = "landing-demo";
const DEMO_AT = "2026-01-01T00:00:00.000Z";

const DEMO_THEME: CvTheme = {
  id: "theme-modern",
  name: "Modern",
  slug: "modern",
  isSystem: true,
  config: { fontFamily: "sans" },
};

function stubSection(id: string, type: SectionType, title: string): Section {
  return {
    id,
    workspaceId: DEMO_WORKSPACE,
    type,
    title,
    createdBy: "demo",
    createdAt: DEMO_AT,
    updatedAt: DEMO_AT,
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
    workspaceId: DEMO_WORKSPACE,
    type,
    headline,
    body,
    metadata,
    showInPreview: true,
    createdBy: "demo",
    createdAt: DEMO_AT,
    updatedAt: DEMO_AT,
  };
}

function buildDemoResume(
  id: string,
  title: string,
  contactProfile: ContactProfile,
  sections: Array<{ section: Section; items: SectionItem[] }>,
): ResumeWithContent {
  return {
    resume: {
      id,
      workspaceId: DEMO_WORKSPACE,
      title,
      contactProfileId: contactProfile.id,
      createdBy: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
    contactProfile,
    settings: {
      resumeId: id,
      themeId: DEMO_THEME.id,
      fontSize: "M",
      contactNameFontSize: "M",
      contactHeadlineFontSize: "M",
      contactDetailsFontSize: "M",
      sectionTitleFontSize: "M",
      itemTitleFontSize: "M",
      itemMetaFontSize: "M",
      pageFormat: "A4",
      marginHorizontalMm: 12,
      marginVerticalMm: 12,
      showPhoto: false,
      itemTitleLayout: "STACKED",
      locale: "en",
    },
    theme: DEMO_THEME,
    sections,
  };
}

export type TailorDemoSource = "github" | "linkedin" | "twin";

export type TailorDemoBullet = {
  text: string;
  source: TailorDemoSource;
};

export type TailorDemoExample = {
  id: string;
  label: string;
  url: string;
  company: string;
  headline: string;
  summary: string;
  skills: string[];
  bullets: TailorDemoBullet[];
};

export type TailorShowcaseExample = TailorDemoExample & {
  preview: ResumeWithContent;
};

export const TAILOR_DEMO_EXAMPLES: TailorDemoExample[] = [
  {
    id: "frontend",
    label: "Senior Frontend Engineer",
    url: "linear.app/careers/senior-frontend-engineer",
    company: "Linear",
    headline: "Senior Frontend Engineer",
    summary:
      "Product-minded frontend engineer who turns design systems into fast, accessible interfaces people love to use.",
    skills: ["React", "TypeScript", "Design systems", "Accessibility", "Web performance"],
    bullets: [
      {
        text: "Built a component library adopted across 7 product teams, cutting UI build time in half.",
        source: "github",
      },
      {
        text: "Led the accessibility pass that took the app to WCAG AA across every core flow.",
        source: "twin",
      },
      {
        text: "Shipped a rendering refactor that dropped largest-contentful-paint from 3.1s to 0.9s.",
        source: "github",
      },
    ],
  },
  {
    id: "ml",
    label: "Machine Learning Engineer",
    url: "openai.com/careers/machine-learning-engineer",
    company: "a research lab",
    headline: "Machine Learning Engineer",
    summary:
      "ML engineer who ships models to production and cares as much about evaluation as accuracy.",
    skills: ["Python", "PyTorch", "Evaluation", "Data pipelines", "MLOps"],
    bullets: [
      {
        text: "Trained and deployed a ranking model that lifted conversion 12% in an A/B test.",
        source: "github",
      },
      {
        text: "Built the offline evaluation harness the whole team now trusts before every release.",
        source: "twin",
      },
      {
        text: "Owned the feature pipeline processing 40M events a day with sub-minute freshness.",
        source: "linkedin",
      },
    ],
  },
  {
    id: "founding",
    label: "Founding Engineer",
    url: "yc.com/jobs/founding-engineer-seed-startup",
    company: "an early-stage startup",
    headline: "Founding Engineer",
    summary:
      "Generalist who goes from blank repo to shipped product, comfortable owning the whole stack and the customer.",
    skills: ["Full-stack", "Product sense", "Postgres", "Shipping fast", "Customer discovery"],
    bullets: [
      {
        text: "Took the first version of the product from idea to paying customers in 9 weeks, solo.",
        source: "twin",
      },
      {
        text: "Designed and ran the backend and infra that served the first 10k users.",
        source: "github",
      },
      {
        text: "Ran 30+ customer interviews and turned them directly into the roadmap.",
        source: "linkedin",
      },
    ],
  },
];

const MUSK_PROFILE: ContactProfile = {
  id: "demo-musk-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Elon Musk",
  headline: "CEO & Chief Engineer — multi-planetary transport and sustainable energy",
  email: "elon@demo.yuse.app",
  location: "Austin, TX",
  website: "spacex.com",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const JOBS_PROFILE: ContactProfile = {
  id: "demo-jobs-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Steve Jobs",
  headline: "CEO & Co-founder — technology at the intersection of liberal arts",
  email: "steve@demo.yuse.app",
  location: "Cupertino, CA",
  website: "apple.com",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const RAMS_PROFILE: ContactProfile = {
  id: "demo-rams-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Dieter Rams",
  headline: "Chief Design Officer — disciplined industrial design, less but better",
  email: "dieter@demo.yuse.app",
  location: "Kronberg, Germany",
  website: "vitsœ.com",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

export const TAILOR_SHOWCASE_EXAMPLES: TailorShowcaseExample[] = [
  {
    id: "musk",
    label: "Elon Musk",
    url: "spacex.com/careers/chief-engineer-starship",
    company: "SpaceX",
    headline: "Chief Engineer — Starship",
    summary:
      "First-principles engineer and operator who builds where physics, manufacturing, and product velocity matter.",
    skills: [
      "First-principles engineering",
      "Manufacturing at scale",
      "Rocket systems",
      "Product velocity",
    ],
    bullets: [
      {
        text: "Led Starship from early prototypes to integrated flight tests, pushing reuse and cadence on orbital-class rockets.",
        source: "github",
      },
      {
        text: "Built a vertically integrated launch business that cut cost-per-kilogram to orbit by an order of magnitude.",
        source: "twin",
      },
      {
        text: "Scaled production culture across engineering, ops, and supply chain for rapid iteration under hard constraints.",
        source: "linkedin",
      },
    ],
    preview: buildDemoResume("demo-musk", "Elon Musk — SpaceX", MUSK_PROFILE, [
      {
        section: stubSection("musk-summary", "SUMMARY", "Summary"),
        items: [
          stubItem(
            "musk-summary-1",
            "SUMMARY",
            "Professional summary",
            "First-principles engineer and operator who builds companies where physics, manufacturing, and product velocity matter. Demo profile for illustration only.",
          ),
        ],
      },
      {
        section: stubSection("musk-exp", "EXPERIENCE", "Experience"),
        items: [
          stubItem(
            "musk-spacex",
            "EXPERIENCE",
            "CEO & Chief Engineer",
            "- Led Starship program from early prototypes to integrated flight tests, pushing reuse and cadence on orbital-class rockets.\n- Built a vertically integrated launch business that cut cost-per-kilogram to orbit by an order of magnitude.\n- Scaled production culture across engineering, ops, and supply chain for rapid iteration under hard constraints.",
            {
              company: "SpaceX",
              location: "Hawthorne, CA",
              startDate: "2002",
              endDate: "Present",
            },
          ),
          stubItem(
            "musk-tesla",
            "EXPERIENCE",
            "CEO & Product Architect",
            "- Drove Model 3/Y ramp and Gigafactory build-out, turning EVs from niche to mass market.\n- Unified hardware, software, and energy products under one product vision.\n- Pushed manufacturing automation and design-for-manufacturing across the fleet.",
            {
              company: "Tesla",
              location: "Austin, TX",
              startDate: "2008",
              endDate: "Present",
            },
          ),
        ],
      },
      {
        section: stubSection("musk-skills", "SKILLS", "Skills"),
        items: [
          stubItem("musk-s1", "SKILLS", "First-principles engineering", "", { level: "EXPERT" }),
          stubItem("musk-s2", "SKILLS", "Manufacturing at scale", "", { level: "EXPERT" }),
          stubItem("musk-s3", "SKILLS", "Rocket & propulsion systems", "", { level: "EXPERT" }),
          stubItem("musk-s4", "SKILLS", "Product velocity", "", { level: "ADVANCED" }),
        ],
      },
    ]),
  },
  {
    id: "jobs",
    label: "Steve Jobs",
    url: "apple.com/careers/product-vision-lead",
    company: "Apple",
    headline: "Product Vision Lead",
    summary:
      "Product leader who believed technology should feel inevitable — simple on the surface, obsessively crafted underneath.",
    skills: [
      "Product vision",
      "Design critique",
      "Storytelling",
      "Brand experience",
    ],
    bullets: [
      {
        text: "Rebuilt Apple's product line around breakthrough devices: iMac, iPod, iPhone, and iPad.",
        source: "twin",
      },
      {
        text: "Instituted end-to-end ownership — hardware, software, retail, and brand as one experience.",
        source: "github",
      },
      {
        text: "Grew Pixar from graphics house to Academy Award–winning studio with a repeatable story-first process.",
        source: "linkedin",
      },
    ],
    preview: buildDemoResume("demo-jobs", "Steve Jobs — Apple", JOBS_PROFILE, [
      {
        section: stubSection("jobs-summary", "SUMMARY", "Summary"),
        items: [
          stubItem(
            "jobs-summary-1",
            "SUMMARY",
            "Professional summary",
            "Product leader who believed technology should feel inevitable — simple on the surface, obsessively crafted underneath. Demo profile for illustration only.",
          ),
        ],
      },
      {
        section: stubSection("jobs-exp", "EXPERIENCE", "Experience"),
        items: [
          stubItem(
            "jobs-apple-2",
            "EXPERIENCE",
            "CEO & Co-founder",
            "- Returned to Apple and rebuilt the product line around a handful of breakthrough devices: iMac, iPod, iPhone, iPad.\n- Instituted a culture of end-to-end ownership — hardware, software, retail, and brand as one experience.\n- Championed design reviews that killed good ideas to protect great ones.",
            {
              company: "Apple",
              location: "Cupertino, CA",
              startDate: "1997",
              endDate: "2011",
            },
          ),
          stubItem(
            "jobs-pixar",
            "EXPERIENCE",
            "Chairman & CEO",
            "- Grew Pixar from graphics house to Academy Award–winning studio with a repeatable story-first process.\n- Negotiated the Disney partnership that scaled Pixar's films worldwide.",
            {
              company: "Pixar",
              location: "Emeryville, CA",
              startDate: "1986",
              endDate: "2006",
            },
          ),
          stubItem(
            "jobs-next",
            "EXPERIENCE",
            "Founder & CEO",
            "- Built NeXT's platform and design language that later became the foundation for macOS and Apple's developer tools.",
            {
              company: "NeXT",
              location: "Redwood City, CA",
              startDate: "1985",
              endDate: "1996",
            },
          ),
        ],
      },
      {
        section: stubSection("jobs-skills", "SKILLS", "Skills"),
        items: [
          stubItem("jobs-s1", "SKILLS", "Product vision", "", { level: "EXPERT" }),
          stubItem("jobs-s2", "SKILLS", "Design critique", "", { level: "EXPERT" }),
          stubItem("jobs-s3", "SKILLS", "Storytelling & keynotes", "", { level: "EXPERT" }),
          stubItem("jobs-s4", "SKILLS", "Brand & retail experience", "", { level: "ADVANCED" }),
        ],
      },
    ]),
  },
  {
    id: "rams",
    label: "Dieter Rams",
    url: "vitsoe.com/careers/head-of-design",
    company: "Vitsoe",
    headline: "Head of Design",
    summary:
      "Industrial designer guided by honesty, restraint, and function. Good design is as little design as possible.",
    skills: [
      "Industrial design systems",
      "Design principles",
      "Materials & manufacturing",
      "Product architecture",
    ],
    bullets: [
      {
        text: "Shaped Braun's visual language across audio, grooming, and kitchen products for decades.",
        source: "github",
      },
      {
        text: "Defined coherent systems of form, color, and typography across hundreds of SKUs.",
        source: "twin",
      },
      {
        text: "Advised on the 606 Universal Shelving System — modular furniture built to outlast trends.",
        source: "linkedin",
      },
    ],
    preview: buildDemoResume("demo-rams", "Dieter Rams — Vitsoe", RAMS_PROFILE, [
      {
        section: stubSection("rams-summary", "SUMMARY", "Summary"),
        items: [
          stubItem(
            "rams-summary-1",
            "SUMMARY",
            "Professional summary",
            "Industrial designer guided by honesty, restraint, and function. Good design is as little design as possible. Demo profile for illustration only.",
          ),
        ],
      },
      {
        section: stubSection("rams-exp", "EXPERIENCE", "Experience"),
        items: [
          stubItem(
            "rams-braun",
            "EXPERIENCE",
            "Chief Design Officer",
            "- Shaped Braun's visual language across audio, grooming, and kitchen products for decades.\n- Defined systems of form, color, and typography that stayed coherent across hundreds of SKUs.\n- Collaborated with engineering so every detail served use, not ornament.",
            {
              company: "Braun",
              location: "Kronberg, Germany",
              startDate: "1961",
              endDate: "1995",
            },
          ),
          stubItem(
            "rams-vitsoe",
            "EXPERIENCE",
            "Design Consultant",
            "- Advised on the 606 Universal Shelving System — modular furniture built to outlast trends.\n- Helped Vitsoe keep a single product line excellent instead of chasing seasonal collections.",
            {
              company: "Vitsoe",
              location: "London, UK",
              startDate: "1959",
              endDate: "Present",
            },
          ),
        ],
      },
      {
        section: stubSection("rams-skills", "SKILLS", "Skills"),
        items: [
          stubItem("rams-s1", "SKILLS", "Industrial design systems", "", { level: "EXPERT" }),
          stubItem("rams-s2", "SKILLS", "Design principles & critique", "", { level: "EXPERT" }),
          stubItem("rams-s3", "SKILLS", "Materials & manufacturing", "", { level: "ADVANCED" }),
          stubItem("rams-s4", "SKILLS", "Furniture & product architecture", "", { level: "EXPERT" }),
        ],
      },
    ]),
  },
];
