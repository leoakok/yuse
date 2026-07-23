"use client";

import { useState } from "react";
import { CvPreview } from "@/components/cv/cv-preview";
import { ApplyDesignDialog } from "@/components/cv/apply-design-dialog";
import { Button } from "@/components/ui/button";
import type { PublicDesignContent } from "@/lib/design/public-api";

type PublicDesignViewProps = {
  content: PublicDesignContent;
  isSignedIn?: boolean;
};

export function PublicDesignView({ content, isSignedIn = false }: PublicDesignViewProps) {
  const [applyOpen, setApplyOpen] = useState(false);
  const title = content.designShare.title || "CV design";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto min-h-screen max-w-4xl p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">Preview this design and apply it to your resume.</p>
          </div>
          <Button type="button" onClick={() => setApplyOpen(true)}>
            Use this design
          </Button>
        </div>

        <CvPreview content={content.preview} interactive className="shadow-sm" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Design shared on Yuse
        </p>
      </div>

      <ApplyDesignDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        designShareId={content.designShare.id}
        designTitle={content.designShare.title}
        isSignedIn={isSignedIn}
      />
    </div>
  );
}
