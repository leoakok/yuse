"use client";

import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { GitHubMark } from "@/components/brand/github-mark";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import {
  animationEnterClass,
  animationHoverClass,
  heroClass,
  heroInnerClass,
  navigationClass,
  projectCardClass,
  projectGridClass,
} from "@/lib/portfolio/site-styles";
import { resolvePortfolioTypography } from "@/lib/portfolio/typography";
import { cn } from "@/lib/utils";

interface PortfolioSitePreviewProps {
  content: PortfolioWithContent;
  className?: string;
  /** When false, links render as static text (e.g. grid thumbnails inside a Link). */
  interactive?: boolean;
}

const NAV_SECTIONS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "testimonials", label: "Testimonials" },
] as const;

export function PortfolioSitePreview({
  content,
  className,
  interactive = true,
}: PortfolioSitePreviewProps) {
  const { portfolio, contactProfile, settings } = content;
  const accent = settings.accentColor || "#2563eb";
  const typography = resolvePortfolioTypography(settings.typographyScale);
  const isSplit = settings.layout === "SPLIT";
  const visibleProjects = content.projects.filter((p) => p.showInPreview);
  const featured = visibleProjects.find((p) => p.featured) ?? visibleProjects[0];
  const otherProjects = visibleProjects.filter((p) => p.id !== featured?.id);
  const visibleSkills = content.skills.filter((s) => s.showInPreview);
  const visibleTestimonials = content.testimonials.filter((t) => t.showInPreview);
  const name = contactProfile?.fullName || "Your name";
  const headline = contactProfile?.headline || portfolio.tagline || "Your headline";
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  const showPhoto = settings.showPhoto && photoUrl;
  const showNav = settings.navigationStyle !== "NONE";
  const enterClass = animationEnterClass(settings.animationLevel);
  const hoverClass = animationHoverClass(settings.animationLevel);

  const heroBackground =
    settings.heroStyle === "GRADIENT" || settings.heroStyle === "CENTERED"
      ? { background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #0f172a) 100%)` }
      : undefined;

  const typographyStyle = {
    "--site-name": `${typography.namePx}px`,
    "--site-headline": `${typography.headlinePx}px`,
    "--site-section": `${typography.sectionLabelPx}px`,
    "--site-body": `${typography.bodyPx}px`,
    "--site-project": `${typography.projectTitlePx}px`,
    "--site-meta": `${typography.metaPx}px`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "min-h-full w-full overflow-hidden rounded-xl bg-background text-foreground shadow-lg ring-1 ring-border",
        className
      )}
      style={typographyStyle}
    >
      {showNav ? (
        <nav className={cn("px-6 py-2.5", navigationClass(settings.navigationStyle))}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 text-xs font-medium">
            <span className="text-foreground/80">{name}</span>
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              {NAV_SECTIONS.map((section) => {
                const navClassName = "hover:text-foreground";
                const navStyle = {
                  color: settings.navigationStyle === "STICKY" ? accent : undefined,
                };
                return interactive ? (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={navClassName}
                    style={navStyle}
                  >
                    {section.label}
                  </a>
                ) : (
                  <span key={section.id} className={navClassName} style={navStyle}>
                    {section.label}
                  </span>
                );
              })}
            </div>
          </div>
        </nav>
      ) : null}

      {isSplit ? (
        <div className="flex min-h-full flex-col lg:flex-row">
          <aside
            className={cn(
              "shrink-0 border-b bg-muted/20 px-6 py-8 lg:w-72 lg:border-b-0 lg:border-r",
              enterClass
            )}
          >
            <SidebarProfile
              name={name}
              headline={headline}
              tagline={portfolio.tagline}
              contactProfile={contactProfile}
              photoUrl={showPhoto ? photoUrl : undefined}
              accent={accent}
              heroStyle={settings.heroStyle}
              interactive={interactive}
            />
            {visibleSkills.length > 0 ? (
              <SkillsBlock skills={visibleSkills} accent={accent} compact />
            ) : null}
          </aside>
          <main className="min-w-0 flex-1 space-y-10 px-6 py-8 lg:px-8">
            <MainSections
              portfolio={portfolio}
              featured={featured}
              otherProjects={otherProjects}
              visibleSkills={[]}
              visibleTestimonials={visibleTestimonials}
              accent={accent}
              settings={settings}
              enterClass={enterClass}
              hoverClass={hoverClass}
              hideSkills
              interactive={interactive}
            />
          </main>
        </div>
      ) : (
        <>
          <header
            className={cn("relative px-8 py-12", heroClass(settings.heroStyle), enterClass)}
            style={heroBackground}
          >
            <div className={heroInnerClass(settings.heroStyle)}>
              {showPhoto ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="size-24 shrink-0 rounded-full border-4 border-white/20 object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <h1
                  className="font-bold tracking-tight"
                  style={{ fontSize: "var(--site-name)" }}
                >
                  {name}
                </h1>
                <p
                  className={cn(
                    "mt-2",
                    settings.heroStyle === "MINIMAL" ? "text-muted-foreground" : "text-white/90"
                  )}
                  style={{ fontSize: "var(--site-headline)" }}
                >
                  {headline}
                </p>
                {portfolio.tagline && contactProfile?.headline ? (
                  <p
                    className={cn(
                      "mt-1",
                      settings.heroStyle === "MINIMAL" ? "text-muted-foreground" : "text-white/75"
                    )}
                    style={{ fontSize: "var(--site-meta)" }}
                  >
                    {portfolio.tagline}
                  </p>
                ) : null}
                <ContactLinks
                  contactProfile={contactProfile}
                  muted={settings.heroStyle !== "MINIMAL"}
                  interactive={interactive}
                />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl space-y-10 px-8 py-10">
            <MainSections
              portfolio={portfolio}
              featured={featured}
              otherProjects={otherProjects}
              visibleSkills={visibleSkills}
              visibleTestimonials={visibleTestimonials}
              accent={accent}
              settings={settings}
              enterClass={enterClass}
              hoverClass={hoverClass}
              interactive={interactive}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SidebarProfile({
  name,
  headline,
  tagline,
  contactProfile,
  photoUrl,
  accent,
  heroStyle,
  interactive = true,
}: {
  name: string;
  headline: string;
  tagline: string;
  contactProfile?: PortfolioWithContent["contactProfile"];
  photoUrl?: string;
  accent: string;
  heroStyle: PortfolioWithContent["settings"]["heroStyle"];
  interactive?: boolean;
}) {
  return (
    <div className="space-y-4">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="size-20 rounded-full object-cover ring-2 ring-offset-2"
          style={{ borderColor: accent }}
        />
      ) : null}
      <div>
        <h1 className="font-bold tracking-tight" style={{ fontSize: "var(--site-name)", color: accent }}>
          {name}
        </h1>
        <p className="mt-1 text-muted-foreground" style={{ fontSize: "var(--site-headline)" }}>
          {headline}
        </p>
        {tagline && contactProfile?.headline ? (
          <p className="mt-1 text-muted-foreground" style={{ fontSize: "var(--site-meta)" }}>
            {tagline}
          </p>
        ) : null}
      </div>
      <ContactLinks contactProfile={contactProfile} muted={heroStyle === "MINIMAL"} interactive={interactive} />
    </div>
  );
}

function ContactLinks({
  contactProfile,
  muted,
  interactive = true,
}: {
  contactProfile?: PortfolioWithContent["contactProfile"];
  muted?: boolean;
  interactive?: boolean;
}) {
  const linkClass = muted ? "text-muted-foreground hover:text-foreground" : "underline-offset-2 hover:underline";
  return (
    <div className={cn("mt-4 flex flex-wrap gap-3", muted ? "text-sm" : "text-sm")} style={{ fontSize: "var(--site-meta)" }}>
      {contactProfile?.website ? (
        interactive ? (
          <a href={contactProfile.website} className={linkClass}>
            Website
          </a>
        ) : (
          <span className={linkClass}>Website</span>
        )
      ) : null}
      {contactProfile?.github ? (
        interactive ? (
          <a href={contactProfile.github} className={cn("inline-flex items-center gap-1", linkClass)}>
            <GitHubMark className="size-3.5" /> GitHub
          </a>
        ) : (
          <span className={cn("inline-flex items-center gap-1", linkClass)}>
            <GitHubMark className="size-3.5" /> GitHub
          </span>
        )
      ) : null}
      {contactProfile?.linkedIn ? (
        interactive ? (
          <a href={contactProfile.linkedIn} className={linkClass}>
            LinkedIn
          </a>
        ) : (
          <span className={linkClass}>LinkedIn</span>
        )
      ) : null}
      {contactProfile?.email ? (
        <span className={muted ? "text-muted-foreground" : "text-white/80"}>{contactProfile.email}</span>
      ) : null}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-semibold uppercase tracking-wider text-muted-foreground"
      style={{ fontSize: "var(--site-section)" }}
    >
      {children}
    </h2>
  );
}

function MainSections({
  portfolio,
  featured,
  otherProjects,
  visibleSkills,
  visibleTestimonials,
  accent,
  settings,
  enterClass,
  hoverClass,
  hideSkills = false,
  interactive = true,
}: {
  portfolio: PortfolioWithContent["portfolio"];
  featured?: PortfolioWithContent["projects"][number];
  otherProjects: PortfolioWithContent["projects"];
  visibleSkills: PortfolioWithContent["skills"];
  visibleTestimonials: PortfolioWithContent["testimonials"];
  accent: string;
  settings: PortfolioWithContent["settings"];
  enterClass: string;
  hoverClass: string;
  hideSkills?: boolean;
  interactive?: boolean;
}) {
  const visibleProjects = featured ? [featured, ...otherProjects] : otherProjects;

  return (
    <>
      {portfolio.about ? (
        <section id="about" className={enterClass}>
          <SectionHeading>About</SectionHeading>
          <p
            className="mt-3 leading-relaxed text-foreground/90"
            style={{ fontSize: "var(--site-body)" }}
          >
            {portfolio.about}
          </p>
        </section>
      ) : null}

      {featured ? (
        <section className={enterClass}>
          <SectionHeading>Featured work</SectionHeading>
          <ProjectCard
            project={featured}
            accent={accent}
            cardStyle={settings.projectCardStyle}
            featured
            hoverClass={hoverClass}
            interactive={interactive}
          />
        </section>
      ) : null}

      {otherProjects.length > 0 ? (
        <section id="projects" className={enterClass}>
          <SectionHeading>Projects</SectionHeading>
          <div className={cn("mt-4 grid gap-4", projectGridClass(settings.projectGridColumns))}>
            {otherProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                accent={accent}
                cardStyle={settings.projectCardStyle}
                hoverClass={hoverClass}
                interactive={interactive}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!hideSkills && visibleSkills.length > 0 ? (
        <section id="skills" className={enterClass}>
          <SkillsBlock skills={visibleSkills} accent={accent} />
        </section>
      ) : null}

      {visibleTestimonials.length > 0 ? (
        <section id="testimonials" className={enterClass}>
          <SectionHeading>Testimonials</SectionHeading>
          <div className="mt-4 space-y-4">
            {visibleTestimonials.map((t) => (
              <blockquote
                key={t.id}
                className="rounded-lg border-l-4 bg-muted/30 px-4 py-3 italic"
                style={{ fontSize: "var(--site-body)", borderColor: accent }}
              >
                &ldquo;{t.quote}&rdquo;
                {t.author ? (
                  <footer className="mt-2 not-italic text-muted-foreground" style={{ fontSize: "var(--site-meta)" }}>
                    - {t.author}
                    {t.role ? `, ${t.role}` : ""}
                  </footer>
                ) : null}
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      {visibleProjects.length === 0 && !portfolio.about ? (
        <p className="text-center text-muted-foreground" style={{ fontSize: "var(--site-body)" }}>
          Add projects and an about section to build your portfolio.
        </p>
      ) : null}
    </>
  );
}

function SkillsBlock({
  skills,
  accent,
  compact = false,
}: {
  skills: PortfolioWithContent["skills"];
  accent: string;
  compact?: boolean;
}) {
  return (
    <section id={compact ? undefined : "skills"} className={compact ? "mt-8" : undefined}>
      {!compact ? <SectionHeading>Skills</SectionHeading> : (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</h3>
      )}
      <div className={cn("flex flex-wrap gap-2", compact ? "mt-2" : "mt-3")}>
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="rounded-full border px-3 py-1 font-medium"
            style={{ borderColor: accent, color: accent, fontSize: "var(--site-meta)" }}
          >
            {skill.name}
          </span>
        ))}
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  accent,
  cardStyle,
  featured = false,
  hoverClass,
  interactive = true,
}: {
  project: PortfolioWithContent["projects"][number];
  accent: string;
  cardStyle: PortfolioWithContent["settings"]["projectCardStyle"];
  featured?: boolean;
  hoverClass: string;
  interactive?: boolean;
}) {
  const isImage = cardStyle === "IMAGE" && project.imageUrl;

  return (
    <article
      className={cn(projectCardClass(cardStyle, featured), hoverClass)}
      style={featured && cardStyle === "STANDARD" ? { borderColor: accent } : undefined}
    >
      {isImage ? (
        <img src={project.imageUrl!} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : null}
      <div className={cn(isImage && "p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold" style={{ fontSize: "var(--site-project)" }}>
              {project.title}
            </h3>
            {project.tagline ? (
              <p className="mt-1 text-muted-foreground" style={{ fontSize: "var(--site-meta)" }}>
                {project.tagline}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            {project.liveUrl ? (
              interactive ? (
                <a href={project.liveUrl} className="text-muted-foreground hover:text-foreground" aria-label="Live demo">
                  <ExternalLink className="size-4" />
                </a>
              ) : (
                <span className="text-muted-foreground" aria-hidden>
                  <ExternalLink className="size-4" />
                </span>
              )
            ) : null}
            {project.repoUrl ? (
              interactive ? (
                <a href={project.repoUrl} className="text-muted-foreground hover:text-foreground" aria-label="Source code">
                  <GitHubMark className="size-4" />
                </a>
              ) : (
                <span className="text-muted-foreground" aria-hidden>
                  <GitHubMark className="size-4" />
                </span>
              )
            ) : null}
          </div>
        </div>
        {project.techStack.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="rounded bg-muted px-2 py-0.5 font-medium uppercase tracking-wide text-muted-foreground"
                style={{ fontSize: "calc(var(--site-meta) - 1px)" }}
              >
                {tech}
              </span>
            ))}
          </div>
        ) : null}
        {cardStyle !== "MINIMAL" && (project.problem || project.outcome) ? (
          <div className="mt-4 space-y-2 leading-relaxed text-muted-foreground" style={{ fontSize: "var(--site-meta)" }}>
            {project.problem ? (
              <p>
                <span className="font-medium text-foreground">Problem:</span> {project.problem}
              </p>
            ) : null}
            {project.outcome ? (
              <p>
                <span className="font-medium text-foreground">Outcome:</span> {project.outcome}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
