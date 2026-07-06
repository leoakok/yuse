import type {
  ContactProfile,
  DesignPresetId,
  ResumeSettings,
  ResumeWithContent,
  Section,
  SectionItem,
  SectionType,
} from "@/lib/types/cv";
import { applyDesignPreset } from "@/lib/cv/design-presets";
import { defaultResumeSettings, normalizeResumeSettings } from "@/lib/cv/resume-settings";
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

const CLASSIC_THEME: CvTheme = {
  id: "theme-classic",
  name: "Classic",
  slug: "classic",
  isSystem: true,
  config: { fontFamily: "serif" },
};

function themeForSettings(settings: ResumeSettings): CvTheme {
  return settings.themeId === CLASSIC_THEME.id ? CLASSIC_THEME : DEMO_THEME;
}

function demoSettings(
  resumeId: string,
  presetId: DesignPresetId,
  overrides: Partial<ResumeSettings> = {},
): ResumeSettings {
  const base = defaultResumeSettings(resumeId);
  return normalizeResumeSettings({
    ...base,
    ...applyDesignPreset(base, presetId),
    columnLayout: "SINGLE",
    ...overrides,
    resumeId,
  });
}

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
  settings: ResumeSettings,
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
    settings,
    theme: themeForSettings(settings),
    sections: sections.map((entry) => ({ ...entry, showInPreview: true })),
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
  /** Design style shown under the carousel preview (e.g. Minimalist, Editorial). */
  styleLabel: string;
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
  headline: "CEO & Chief Engineer, multi-planetary transport and sustainable energy",
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
  headline: "CEO & Co-founder, technology at the intersection of liberal arts",
  email: "steve@demo.yuse.app",
  location: "Cupertino, CA",
  website: "apple.com",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const KAWAKUBO_PROFILE: ContactProfile = {
  id: "demo-kawakubo-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Rei Kawakubo",
  headline: "Founder & Creative Director, fashion that questions shape and convention",
  email: "rei@demo.yuse.app",
  location: "Tokyo, Japan",
  website: "comme-des-garcons.com",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const CURIE_PROFILE: ContactProfile = {
  id: "demo-curie-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Marie Curie",
  headline: "Physicist & Chemist, pioneering research in radioactivity",
  email: "marie@demo.yuse.app",
  location: "Paris, France",
  website: "nobelprize.org",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const MORRISON_PROFILE: ContactProfile = {
  id: "demo-morrison-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Toni Morrison",
  headline: "Novelist & Editor, literary voice and narrative craft",
  email: "toni@demo.yuse.app",
  location: "New York, NY",
  website: "tonimorrison.org",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

const HOPPER_PROFILE: ContactProfile = {
  id: "demo-hopper-profile",
  workspaceId: DEMO_WORKSPACE,
  fullName: "Grace Hopper",
  headline: "Computer scientist, compilers, and the first modern programming languages",
  email: "grace@demo.yuse.app",
  location: "Arlington, VA",
  website: "yale.edu",
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

export const TAILOR_SHOWCASE_EXAMPLES: TailorShowcaseExample[] = [
  {
    id: "musk",
    label: "Elon Musk",
    url: "spacex.com/careers/chief-engineer-starship",
    company: "SpaceX",
    headline: "Chief Engineer, Starship",
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
    styleLabel: "Bold",
    preview: buildDemoResume(
      "demo-musk",
      "Elon Musk, SpaceX",
      MUSK_PROFILE,
      [
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
    ],
      demoSettings("demo-musk", "BOLD", {
        accentColor: "#ea580c",
        marginHorizontalMm: 18,
        marginVerticalMm: 20,
      }),
    ),
  },
  {
    id: "jobs",
    label: "Steve Jobs",
    url: "apple.com/careers/product-vision-lead",
    company: "Apple",
    headline: "Product Vision Lead",
    summary:
      "Product leader who believed technology should feel inevitable, simple on the surface, obsessively crafted underneath.",
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
        text: "Instituted end-to-end ownership, hardware, software, retail, and brand as one experience.",
        source: "github",
      },
      {
        text: "Grew Pixar from graphics house to Academy Award-winning studio with a repeatable story-first process.",
        source: "linkedin",
      },
    ],
    styleLabel: "Classic",
    preview: buildDemoResume(
      "demo-jobs",
      "Steve Jobs, Apple",
      JOBS_PROFILE,
      [
      {
        section: stubSection("jobs-summary", "SUMMARY", "Summary"),
        items: [
          stubItem(
            "jobs-summary-1",
            "SUMMARY",
            "Professional summary",
            "Product leader who believed technology should feel inevitable, simple on the surface, obsessively crafted underneath. Demo profile for illustration only.",
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
            "- Returned to Apple and rebuilt the product line around a handful of breakthrough devices: iMac, iPod, iPhone, iPad.\n- Instituted a culture of end-to-end ownership, hardware, software, retail, and brand as one experience.\n- Championed design reviews that killed good ideas to protect great ones.",
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
            "- Grew Pixar from graphics house to Academy Award-winning studio with a repeatable story-first process.\n- Negotiated the Disney partnership that scaled Pixar's films worldwide.",
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
    ],
      demoSettings("demo-jobs", "CLASSIC", {
        accentColor: "#334155",
        sectionDividerStyle: "TEXT_WIDTH",
        contactLayout: "STACKED",
        pageBackground: "OFF_WHITE",
      }),
    ),
  },
  {
    id: "kawakubo",
    label: "Rei Kawakubo",
    url: "comme-des-garcons.com/careers/creative-director",
    company: "Comme des Garçons",
    headline: "Creative Director",
    summary:
      "Fashion designer who treats clothing as architecture, challenging symmetry, color, and expectation.",
    skills: [
      "Concept development",
      "Avant-garde design",
      "Brand narrative",
      "Runway direction",
    ],
    bullets: [
      {
        text: "Founded Comme des Garçons and built a global house known for radical silhouettes and anti-fashion provocation.",
        source: "twin",
      },
      {
        text: "Directed seasonal collections that reframed how editors, buyers, and the public read contemporary dress.",
        source: "github",
      },
      {
        text: "Collaborated with artists and retailers to keep the brand independent while reaching new audiences.",
        source: "linkedin",
      },
    ],
    styleLabel: "Creative",
    preview: buildDemoResume(
      "demo-kawakubo",
      "Rei Kawakubo, Comme des Garçons",
      KAWAKUBO_PROFILE,
      [
        {
          section: stubSection("kawakubo-summary", "SUMMARY", "Summary"),
          items: [
            stubItem(
              "kawakubo-summary-1",
              "SUMMARY",
              "Professional summary",
              "Fashion designer who treats clothing as architecture, questioning symmetry, color, and expectation with every collection. Demo profile for illustration only.",
            ),
          ],
        },
        {
          section: stubSection("kawakubo-exp", "EXPERIENCE", "Experience"),
          items: [
            stubItem(
              "kawakubo-cdg",
              "EXPERIENCE",
              "Founder & Creative Director",
              "- Built Comme des Garçons into a global house known for radical silhouettes and anti-fashion provocation.\n- Directed seasonal collections that reframed how editors and buyers read contemporary dress.\n- Kept creative control while expanding into Dover Street Market and collaborative retail.",
              {
                company: "Comme des Garçons",
                location: "Tokyo, Japan",
                startDate: "1969",
                endDate: "Present",
              },
            ),
            stubItem(
              "kawakubo-dsm",
              "EXPERIENCE",
              "Retail Concept Lead",
              "- Launched Dover Street Market as a curated space for emerging and established designers.\n- Designed store environments that feel like galleries, not traditional boutiques.",
              {
                company: "Dover Street Market",
                location: "London, UK",
                startDate: "2004",
                endDate: "Present",
              },
            ),
          ],
        },
        {
          section: stubSection("kawakubo-skills", "SKILLS", "Skills"),
          items: [
            stubItem("kawakubo-s1", "SKILLS", "Concept development", "", { level: "EXPERT" }),
            stubItem("kawakubo-s2", "SKILLS", "Avant-garde design", "", { level: "EXPERT" }),
            stubItem("kawakubo-s3", "SKILLS", "Brand narrative", "", { level: "ADVANCED" }),
            stubItem("kawakubo-s4", "SKILLS", "Runway direction", "", { level: "EXPERT" }),
          ],
        },
      ],
      demoSettings("demo-kawakubo", "CREATIVE", {
        accentColor: "#be185d",
        contactNameFontSize: "XL",
        contactLayout: "ICON_LABEL",
        skillsLayout: "TAGS",
        itemTitleSeparator: "PIPE",
        datePosition: "INLINE",
      }),
    ),
  },
  {
    id: "curie",
    label: "Marie Curie",
    url: "nobelprize.org/careers/research-fellow",
    company: "Institut Curie",
    headline: "Research Fellow, Radioactivity",
    summary:
      "Physicist and chemist who isolated radium and polonium, opening the field of radioactivity.",
    skills: [
      "Radioactivity research",
      "Laboratory methods",
      "Scientific writing",
      "Teaching",
    ],
    bullets: [
      {
        text: "Isolated radium and polonium, defining new elements and methods for studying atomic structure.",
        source: "github",
      },
      {
        text: "Won Nobel Prizes in both Physics and Chemistry, the first person to do so.",
        source: "twin",
      },
      {
        text: "Directed the Institut Curie and trained a generation of researchers in rigorous lab practice.",
        source: "linkedin",
      },
    ],
    styleLabel: "Minimalist",
    preview: buildDemoResume(
      "demo-curie",
      "Marie Curie, Institut Curie",
      CURIE_PROFILE,
      [
        {
          section: stubSection("curie-summary", "SUMMARY", "Summary"),
          items: [
            stubItem(
              "curie-summary-1",
              "SUMMARY",
              "Professional summary",
              "Physicist and chemist who isolated radium and polonium, opening the field of radioactivity and rigorous laboratory science. Demo profile for illustration only.",
            ),
          ],
        },
        {
          section: stubSection("curie-exp", "EXPERIENCE", "Experience"),
          items: [
            stubItem(
              "curie-institut",
              "EXPERIENCE",
              "Director",
              "- Led the Institut Curie and trained researchers in precise measurement and safe handling of radioactive materials.\n- Published foundational papers on radioactivity that shaped modern physics and chemistry.\n- Built mobile radiography units used in field hospitals during the First World War.",
              {
                company: "Institut Curie",
                location: "Paris, France",
                startDate: "1906",
                endDate: "1934",
              },
            ),
            stubItem(
              "curie-sorbonne",
              "EXPERIENCE",
              "Professor of Physics",
              "- First woman to teach at the Sorbonne, lecturing on radioactivity and experimental method.\n- Supervised doctoral work that extended understanding of atomic decay.",
              {
                company: "University of Paris",
                location: "Paris, France",
                startDate: "1906",
                endDate: "1934",
              },
            ),
          ],
        },
        {
          section: stubSection("curie-skills", "SKILLS", "Skills"),
          items: [
            stubItem("curie-s1", "SKILLS", "Radioactivity research", "", { level: "EXPERT" }),
            stubItem("curie-s2", "SKILLS", "Laboratory methods", "", { level: "EXPERT" }),
            stubItem("curie-s3", "SKILLS", "Scientific writing", "", { level: "EXPERT" }),
            stubItem("curie-s4", "SKILLS", "Teaching", "", { level: "ADVANCED" }),
          ],
        },
      ],
      demoSettings("demo-curie", "MINIMAL", {
        accentColor: "#52525b",
        marginHorizontalMm: 22,
        marginVerticalMm: 24,
        pageBackground: "WHITE",
      }),
    ),
  },
  {
    id: "morrison",
    label: "Toni Morrison",
    url: "randomhouse.com/careers/senior-editor",
    company: "Random House",
    headline: "Senior Editor",
    summary:
      "Novelist and editor whose work centers Black life with precision, lyricism, and moral clarity.",
    skills: [
      "Literary editing",
      "Narrative craft",
      "Author development",
      "Critical writing",
    ],
    bullets: [
      {
        text: "Authored Beloved, Song of Solomon, and a body of fiction that reshaped American letters.",
        source: "twin",
      },
      {
        text: "Edited emerging voices at Random House while maintaining a disciplined daily writing practice.",
        source: "github",
      },
      {
        text: "Taught creative writing at Princeton, mentoring writers on voice, structure, and revision.",
        source: "linkedin",
      },
    ],
    styleLabel: "Editorial",
    preview: buildDemoResume(
      "demo-morrison",
      "Toni Morrison, Random House",
      MORRISON_PROFILE,
      [
        {
          section: stubSection("morrison-summary", "SUMMARY", "Summary"),
          items: [
            stubItem(
              "morrison-summary-1",
              "SUMMARY",
              "Professional summary",
              "Novelist and editor whose work centers Black life with precision, lyricism, and moral clarity. Demo profile for illustration only.",
            ),
          ],
        },
        {
          section: stubSection("morrison-exp", "EXPERIENCE", "Experience"),
          items: [
            stubItem(
              "morrison-author",
              "EXPERIENCE",
              "Novelist",
              "- Published Beloved, Song of Solomon, and a body of fiction that reshaped American letters.\n- Won the Nobel Prize in Literature for novels of visionary force and poetic import.\n- Balanced public readings and essays with long-form drafting and revision.",
              {
                company: "Independent",
                location: "New York, NY",
                startDate: "1970",
                endDate: "2019",
              },
            ),
            stubItem(
              "morrison-editor",
              "EXPERIENCE",
              "Senior Editor",
              "- Acquired and edited fiction by emerging Black authors at Random House.\n- Championed manuscripts that later became landmark works in contemporary literature.",
              {
                company: "Random House",
                location: "New York, NY",
                startDate: "1967",
                endDate: "1983",
              },
            ),
          ],
        },
        {
          section: stubSection("morrison-skills", "SKILLS", "Skills"),
          items: [
            stubItem("morrison-s1", "SKILLS", "Literary editing", "", { level: "EXPERT" }),
            stubItem("morrison-s2", "SKILLS", "Narrative craft", "", { level: "EXPERT" }),
            stubItem("morrison-s3", "SKILLS", "Author development", "", { level: "ADVANCED" }),
            stubItem("morrison-s4", "SKILLS", "Critical writing", "", { level: "EXPERT" }),
          ],
        },
      ],
      demoSettings("demo-morrison", "ACADEMIC", {
        headingFontFamily: "SERIF",
        bodyFontFamily: "SANS",
        accentColor: "#92400e",
        pageBackground: "OFF_WHITE",
        sectionDividerStyle: "FULL",
        sectionTitleCase: "UPPERCASE",
        nameFontWeight: "LIGHT",
        lineHeight: "RELAXED",
        contactNameFontSize: "L",
        descriptionStyle: "PARAGRAPH",
        contactLayout: "STACKED",
      }),
    ),
  },
  {
    id: "hopper",
    label: "Grace Hopper",
    url: "yale.edu/careers/computer-science-fellow",
    company: "Yale University",
    headline: "Computer Science Fellow",
    summary:
      "Mathematician and naval officer who helped build the first compilers and made programming accessible.",
    skills: [
      "Compiler design",
      "Programming languages",
      "Systems architecture",
      "Technical leadership",
    ],
    bullets: [
      {
        text: "Developed the first compiler and advocated for English-like programming languages that became COBOL.",
        source: "github",
      },
      {
        text: "Led Navy teams standardizing computer languages and bringing rigorous engineering to software.",
        source: "linkedin",
      },
      {
        text: "Taught at Yale and mentored engineers on clarity, documentation, and reusable abstractions.",
        source: "twin",
      },
    ],
    styleLabel: "Professional",
    preview: buildDemoResume(
      "demo-hopper",
      "Grace Hopper, Yale University",
      HOPPER_PROFILE,
      [
        {
          section: stubSection("hopper-summary", "SUMMARY", "Summary"),
          items: [
            stubItem(
              "hopper-summary-1",
              "SUMMARY",
              "Professional summary",
              "Mathematician and naval officer who helped build the first compilers and made programming languages approachable for working engineers. Demo profile for illustration only.",
            ),
          ],
        },
        {
          section: stubSection("hopper-exp", "EXPERIENCE", "Experience"),
          items: [
            stubItem(
              "hopper-navy",
              "EXPERIENCE",
              "Rear Admiral, Computer Science",
              "- Developed the first compiler and championed English-like programming languages that led to COBOL.\n- Standardized Navy computing practices and brought rigorous engineering discipline to software teams.\n- Retired from the Navy after decades of service, then continued as a consultant and speaker.",
              {
                company: "U.S. Navy",
                location: "Arlington, VA",
                startDate: "1943",
                endDate: "1986",
              },
            ),
            stubItem(
              "hopper-yale",
              "EXPERIENCE",
              "Adjunct Professor",
              "- Taught computer science at Yale and mentored students on compilers and language design.\n- Emphasized readable code, documentation, and reusable abstractions in every project.",
              {
                company: "Yale University",
                location: "New Haven, CT",
                startDate: "1971",
                endDate: "1986",
              },
            ),
          ],
        },
        {
          section: stubSection("hopper-skills", "SKILLS", "Skills"),
          items: [
            stubItem("hopper-s1", "SKILLS", "Compiler design", "", { level: "EXPERT" }),
            stubItem("hopper-s2", "SKILLS", "Programming languages", "", { level: "EXPERT" }),
            stubItem("hopper-s3", "SKILLS", "Systems architecture", "", { level: "ADVANCED" }),
            stubItem("hopper-s4", "SKILLS", "Technical leadership", "", { level: "EXPERT" }),
          ],
        },
      ],
      demoSettings("demo-hopper", "PROFESSIONAL", {
        accentColor: "#059669",
        skillsLayout: "COLUMNS",
        itemTitleOrder: "COMPANY_FIRST",
      }),
    ),
  },
];
