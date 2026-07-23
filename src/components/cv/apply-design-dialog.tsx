"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { applyDesignShare } from "@/lib/api/design-share-api";
import { listResumes } from "@/lib/api/cv-api";
import { resumePath } from "@/lib/cv/routes";
import { stashPendingDesignShare } from "@/lib/design/apply-design";
import type { Resume } from "@/lib/types/cv";
import { cn } from "@/lib/utils";

type ApplyDesignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designShareId: string;
  designTitle?: string | null;
  isSignedIn?: boolean;
};

export function ApplyDesignDialog({
  open,
  onOpenChange,
  designShareId,
  designTitle,
  isSignedIn = false,
}: ApplyDesignDialogProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | "new" | null>(null);
  const [selectedId, setSelectedId] = useState<string | "new">("new");

  useEffect(() => {
    if (!open || !isSignedIn) return;
    setLoading(true);
    void listResumes()
      .then((items) => {
        setResumes(items);
        setSelectedId(items[0]?.id ?? "new");
      })
      .finally(() => setLoading(false));
  }, [open, isSignedIn]);

  async function handleApply() {
    if (!isSignedIn) {
      stashPendingDesignShare({ designShareId, title: designTitle });
      toast.message("Sign in to use this design");
      onOpenChange(false);
      router.push("/login");
      return;
    }

    setApplyingId(selectedId);
    try {
      const resume = await applyDesignShare(
        designShareId,
        selectedId === "new" ? undefined : selectedId,
      );
      toast.success(designTitle ? `Applied ${designTitle}` : "Design applied");
      onOpenChange(false);
      router.push(resumePath(resume.id));
    } catch {
      toast.error("Could not apply that design. Try again.");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Use this design</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Pick a resume to restyle, or start a new one with this design.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isSignedIn ? (
          loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedId("new")}
                className={cn(
                  "flex w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  selectedId === "new"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span className="font-medium">Create new resume</span>
              </button>
              {resumes.map((resume) => (
                <button
                  key={resume.id}
                  type="button"
                  onClick={() => setSelectedId(resume.id)}
                  className={cn(
                    "flex w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    selectedId === resume.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className="font-medium">{resume.title}</span>
                </button>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in to apply this design to your resumes.
          </p>
        )}

        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={applyingId !== null} onClick={() => void handleApply()}>
            {applyingId !== null ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {isSignedIn ? "Apply design" : "Sign in to use"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
