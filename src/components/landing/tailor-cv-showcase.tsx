"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CvPreview } from "@/components/cv/cv-preview";
import { Button } from "@/components/ui/button";
import { getPageSizePx } from "@/lib/cv/page-format";
import { resumePath } from "@/lib/cv/routes";
import { TAILOR_SHOWCASE_EXAMPLES } from "@/lib/landing/tailor-demo-content";
import type { TailorShowcaseExample } from "@/lib/landing/tailor-demo-content";
import {
  createResumeFromShowcaseDesign,
  pendingDesignFromShowcase,
  stashPendingShowcaseDesign,
} from "@/lib/landing/start-with-design";
import type { ResumeWithContent } from "@/lib/types/cv";
import { cn } from "@/lib/utils";

function LandingA4CvPreview({
  content,
  label,
  styleLabel,
  className,
  footer,
}: {
  content: ResumeWithContent;
  label: string;
  styleLabel: string;
  className?: string;
  footer?: ReactNode;
}) {
  const pageFormat = content.settings?.pageFormat ?? "A4";
  const fallbackPageSize = useMemo(() => getPageSizePx(pageFormat), [pageFormat]);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => 360 / fallbackPageSize.width);
  const [pageSize, setPageSize] = useState(fallbackPageSize);

  useEffect(() => {
    const container = containerRef.current;
    const page = pageRef.current;
    if (!container || !page) return;

    const updateScale = () => {
      const pageWidth = page.offsetWidth || fallbackPageSize.width;
      const pageHeight = page.offsetHeight || fallbackPageSize.height;
      const available = container.clientWidth;
      if (pageWidth > 0 && available > 0) {
        const nextScale = Math.min(1, available / pageWidth);
        setScale(nextScale);
        setPageSize({ width: pageWidth, height: pageHeight });
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(page);
    return () => observer.disconnect();
  }, [content, fallbackPageSize]);

  const scaledWidth = pageSize.width * scale;
  const scaledHeight = pageSize.height * scale;

  return (
    <figure className={cn("flex min-w-0 flex-col gap-2", className)}>
      <figcaption className="text-center">
        <span className="text-sm font-medium text-foreground">{styleLabel}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{label}</span>
      </figcaption>
      <div ref={containerRef} className="flex w-full justify-center overflow-hidden px-2 pb-1 pt-1">
        <div
          className="relative shrink-0 overflow-hidden rounded-sm shadow-lg ring-1 ring-black/5"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width: pageSize.width,
              transform: `scale(${scale})`,
            }}
          >
            <div ref={pageRef}>
              <CvPreview content={content} singlePage className="rounded-none shadow-none ring-0" />
            </div>
          </div>
        </div>
      </div>
      {footer}
    </figure>
  );
}

type TailorCvShowcaseProps = {
  isSignedIn?: boolean;
};

export function TailorCvShowcase({ isSignedIn = false }: TailorCvShowcaseProps) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);

  async function handleStartWith(example: TailorShowcaseExample) {
    const design = pendingDesignFromShowcase(example);

    if (!isSignedIn) {
      stashPendingShowcaseDesign(design);
      toast.message(`Sign in to start with ${example.styleLabel}`);
      router.push("/login");
      return;
    }

    setStartingId(example.id);
    try {
      const resume = await createResumeFromShowcaseDesign(design);
      toast.success(`Started a ${example.styleLabel} resume`);
      router.push(resumePath(resume.id));
    } catch {
      toast.error("Could not create that resume. Try again.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="w-full">
      <div className="mx-auto mb-6 max-w-5xl">
        <p className="text-balance font-serif text-xl tracking-tight sm:text-2xl">
          Full A4 CVs, tailored and print-ready
        </p>
      </div>

      <div className="relative -mx-5 sm:-mx-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:w-12"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:w-12"
        />

        <div className="flex gap-6 overflow-x-auto px-5 pb-3 snap-x snap-mandatory scroll-pl-5 sm:scroll-pl-8 sm:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TAILOR_SHOWCASE_EXAMPLES.map((example) => (
            <LandingA4CvPreview
              key={example.id}
              content={example.preview}
              label={example.label}
              styleLabel={example.styleLabel}
              className="w-[min(78vw,360px)] shrink-0 snap-center md:w-[380px]"
              footer={
                <div className="flex justify-center px-2 pb-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4"
                    disabled={startingId === example.id}
                    onClick={() => void handleStartWith(example)}
                  >
                    {startingId === example.id
                      ? "Starting…"
                      : `Start with ${example.styleLabel}`}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
