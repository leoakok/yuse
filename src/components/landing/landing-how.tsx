import type { ReactNode } from "react";
import { Brain, GitBranch, Wand2 } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { TailorDemo } from "@/components/landing/tailor-demo";
import { LinkedInMark } from "@/components/landing/brand-icons";

type Step = {
  icon: ReactNode;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: <Brain className="size-5" />,
    title: "I get to know you over time",
    body: "We talk, and I remember. I build a Digital Twin of your real work — every project, decision, and result — kept in a clear story structure so nothing about you gets lost.",
  },
  {
    icon: <GitBranch className="size-5" />,
    title: "I connect to your GitHub",
    body: "I read your actual repositories and pull out the projects you really shipped, so your CV is grounded in what you've truly built.",
  },
  {
    icon: <LinkedInMark className="size-5" />,
    title: "I bring in your LinkedIn",
    body: "Just give me your username. I bring your roles and history across, so you never start from a blank page.",
  },
  {
    icon: <Wand2 className="size-5" />,
    title: "You paste a job link",
    body: "Then I craft the most tailored CV for that exact application — choosing the right work, the right words, the right emphasis for this one role.",
  },
];

export function LandingHow() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            How I work
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            I learn the real you, then tailor it to the moment
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Not a template you fill in. A growing understanding of your work that
            sharpens with every CV we make together.
          </p>
        </Reveal>

        <ol className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 80}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {step.icon}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-16" delay={80}>
          <TailorDemo />
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-2xl text-center">
          <p className="text-balance text-xl font-medium tracking-tight sm:text-2xl">
            The more you use me, the better I know you — and the sharper every CV
            becomes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
