"use client";

import { ExternalLink } from "lucide-react";
import { GitHubMark } from "@/components/brand/github-mark";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";
import { cn } from "@/lib/utils";

interface PortfolioSitePreviewProps {
  content: PortfolioWithContent;
  className?: string;
}

export function PortfolioSitePreview({ content, className }: PortfolioSitePreviewProps) {
  const { portfolio, contactProfile, settings } = content;
  const accent = settings.accentColor || "#2563eb";
  const visibleProjects = content.projects.filter((p) => p.showInPreview);
  const featured = visibleProjects.find((p) => p.featured) ?? visibleProjects[0];
  const otherProjects = visibleProjects.filter((p) => p.id !== featured?.id);
  const visibleSkills = content.skills.filter((s) => s.showInPreview);
  const visibleTestimonials = content.testimonials.filter((t) => t.showInPreview);
  const name = contactProfile?.fullName || "Your name";
  const headline = contactProfile?.headline || portfolio.tagline || "Your headline";
  const photoUrl = effectiveContactPhotoUrl(contactProfile);
  const showPhoto = settings.showPhoto && photoUrl;

  return (
    <div
      className={cn(
        "min-h-full w-full overflow-hidden rounded-xl bg-background text-foreground shadow-lg ring-1 ring-border",
        className
      )}
    >
      <header
        className="relative px-8 py-12 text-white"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #0f172a) 100%)` }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center">
          {showPhoto ? (
            <img
              src={photoUrl}
              alt=""
              className="size-24 shrink-0 rounded-full border-4 border-white/20 object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <p className="mt-2 text-lg text-white/90">{headline}</p>
            {portfolio.tagline && contactProfile?.headline ? (
              <p className="mt-1 text-sm text-white/75">{portfolio.tagline}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {contactProfile?.website ? (
                <a href={contactProfile.website} className="underline-offset-2 hover:underline">
                  Website
                </a>
              ) : null}
              {contactProfile?.github ? (
                <a href={contactProfile.github} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                  <GitHubMark className="size-3.5" /> GitHub
                </a>
              ) : null}
              {contactProfile?.linkedIn ? (
                <a href={contactProfile.linkedIn} className="underline-offset-2 hover:underline">
                  LinkedIn
                </a>
              ) : null}
              {contactProfile?.email ? (
                <span className="text-white/80">{contactProfile.email}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-10 px-8 py-10">
        {portfolio.about ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{portfolio.about}</p>
          </section>
        ) : null}

        {featured ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured work</h2>
            <ProjectCard project={featured} accent={accent} featured />
          </section>
        ) : null}

        {otherProjects.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</h2>
            <div className="mt-4 grid gap-4">
              {otherProjects.map((project) => (
                <ProjectCard key={project.id} project={project} accent={accent} />
              ))}
            </div>
          </section>
        ) : null}

        {visibleSkills.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: accent, color: accent }}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {visibleTestimonials.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Testimonials</h2>
            <div className="mt-4 space-y-4">
              {visibleTestimonials.map((t) => (
                <blockquote key={t.id} className="rounded-lg border-l-4 bg-muted/30 px-4 py-3 text-sm italic">
                  &ldquo;{t.quote}&rdquo;
                  {t.author ? (
                    <footer className="mt-2 text-xs not-italic text-muted-foreground">
                      — {t.author}
                      {t.role ? `, ${t.role}` : ""}
                    </footer>
                  ) : null}
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        {visibleProjects.length === 0 && !portfolio.about ? (
          <p className="text-center text-sm text-muted-foreground">
            Add projects and an about section to build your portfolio.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  accent,
  featured = false,
}: {
  project: PortfolioWithContent["projects"][number];
  accent: string;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "mt-4 rounded-xl border bg-card p-5",
        featured && "ring-1"
      )}
      style={featured ? { borderColor: accent } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{project.title}</h3>
          {project.tagline ? (
            <p className="mt-1 text-sm text-muted-foreground">{project.tagline}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {project.liveUrl ? (
            <a href={project.liveUrl} className="text-muted-foreground hover:text-foreground" aria-label="Live demo">
              <ExternalLink className="size-4" />
            </a>
          ) : null}
          {project.repoUrl ? (
            <a href={project.repoUrl} className="text-muted-foreground hover:text-foreground" aria-label="Source code">
              <GitHubMark className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
      {project.techStack.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.techStack.map((tech) => (
            <span key={tech} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {tech}
            </span>
          ))}
        </div>
      ) : null}
      {project.problem || project.outcome ? (
        <div className="mt-4 space-y-2 text-xs leading-relaxed text-muted-foreground">
          {project.problem ? <p><span className="font-medium text-foreground">Problem:</span> {project.problem}</p> : null}
          {project.outcome ? <p><span className="font-medium text-foreground">Outcome:</span> {project.outcome}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
