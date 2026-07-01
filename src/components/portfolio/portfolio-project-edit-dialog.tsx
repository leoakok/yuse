"use client";

import { useEffect, useState } from "react";
import type { PortfolioProject } from "@/lib/types/portfolio";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ProjectDialogState {
  mode: "create" | "edit";
  project?: PortfolioProject;
}

interface PortfolioProjectEditDialogProps {
  state: ProjectDialogState | null;
  onClose: () => void;
  onSave: (values: {
    title: string;
    tagline: string;
    problem: string;
    approach: string;
    outcome: string;
    techStack: string[];
    liveUrl: string;
    repoUrl: string;
    featured: boolean;
  }) => Promise<void>;
}

export function PortfolioProjectEditDialog({
  state,
  onClose,
  onSave,
}: PortfolioProjectEditDialogProps) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [problem, setProblem] = useState("");
  const [approach, setApproach] = useState("");
  const [outcome, setOutcome] = useState("");
  const [techStack, setTechStack] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    const p = state.project;
    setTitle(p?.title ?? "");
    setTagline(p?.tagline ?? "");
    setProblem(p?.problem ?? "");
    setApproach(p?.approach ?? "");
    setOutcome(p?.outcome ?? "");
    setTechStack(p?.techStack?.join(", ") ?? "");
    setLiveUrl(p?.liveUrl ?? "");
    setRepoUrl(p?.repoUrl ?? "");
    setFeatured(p?.featured ?? false);
  }, [state]);

  if (!state) return null;

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave({
        title,
        tagline,
        problem,
        approach,
        outcome,
        techStack: techStack.split(",").map((s) => s.trim()).filter(Boolean),
        liveUrl,
        repoUrl,
        featured,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state.mode === "create" ? "Add project" : "Edit project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="project-title" className="text-sm font-medium">Title</label>
            <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="project-tagline" className="text-sm font-medium">Tagline</label>
            <Input id="project-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line description" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="project-problem" className="text-sm font-medium">Problem</label>
            <Textarea id="project-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="project-approach" className="text-sm font-medium">Approach</label>
            <Textarea id="project-approach" value={approach} onChange={(e) => setApproach(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="project-outcome" className="text-sm font-medium">Outcome</label>
            <Textarea id="project-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="project-tech" className="text-sm font-medium">Tech stack (comma-separated)</label>
            <Input id="project-tech" value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="Next.js, TypeScript, PostgreSQL" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="project-live" className="text-sm font-medium">Live URL</label>
              <Input id="project-live" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="project-repo" className="text-sm font-medium">Repo URL</label>
              <Input id="project-repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 rounded border" />
            Featured project (hero)
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleSubmit()} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
