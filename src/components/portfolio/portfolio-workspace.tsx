"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  EyeOff,
  LayoutTemplate,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import {
  PortfolioDesignSettings,
  portfolioDesignSnapshotFromSettings,
  type PortfolioDesignSnapshot,
} from "@/components/portfolio/portfolio-design-settings";
import { PortfolioShareDialog } from "@/components/portfolio/portfolio-share-dialog";
import { PortfolioProfileSection } from "@/components/portfolio/portfolio-profile-section";
import {
  PortfolioProjectEditDialog,
  type ProjectDialogState,
} from "@/components/portfolio/portfolio-project-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  addPortfolioProject,
  addPortfolioSkill,
  deletePortfolio,
  deletePortfolioProject,
  deletePortfolioSkill,
  duplicatePortfolio,
  setPortfolioProjectVisibility,
  updatePortfolio,
  updatePortfolioProject,
} from "@/lib/api/portfolio-api";
import { portfolioPath } from "@/lib/portfolio/routes";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { cn } from "@/lib/utils";

type WorkspaceMode = "content" | "design";

interface PortfolioWorkspaceProps {
  content: PortfolioWithContent;
  onContentChange: (content: PortfolioWithContent) => void;
  onPreviewSettingsChange?: (patch: Partial<PortfolioWithContent["settings"]>) => void;
}

export function PortfolioWorkspace({
  content,
  onContentChange,
  onPreviewSettingsChange,
}: PortfolioWorkspaceProps) {
  const router = useRouter();
  const { user } = useWorkspace();
  const [mode, setMode] = useState<WorkspaceMode>("content");
  const [shareOpen, setShareOpen] = useState(false);
  const [publicUsername, setPublicUsername] = useState<string | null>(user.username ?? null);
  const [design, setDesign] = useState<PortfolioDesignSnapshot>(() =>
    portfolioDesignSnapshotFromSettings(content.settings)
  );
  const [savedDesign, setSavedDesign] = useState<PortfolioDesignSnapshot>(() =>
    portfolioDesignSnapshotFromSettings(content.settings)
  );
  const [about, setAbout] = useState(content.portfolio.about);
  const [tagline, setTagline] = useState(content.portfolio.tagline);
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

  const portfolioId = content.portfolio.id;

  useEffect(() => {
    setPublicUsername(user.username ?? null);
  }, [user.username]);

  async function handleSaveAbout() {
    setSavingAbout(true);
    try {
      await updatePortfolio(portfolioId, { tagline, about });
      onContentChange({
        ...content,
        portfolio: { ...content.portfolio, tagline, about },
      });
      toast.success("About section saved.");
    } finally {
      setSavingAbout(false);
    }
  }

  async function handleProjectSave(values: {
    title: string;
    tagline: string;
    problem: string;
    approach: string;
    outcome: string;
    techStack: string[];
    liveUrl: string;
    repoUrl: string;
    featured: boolean;
  }) {
    if (projectDialog?.mode === "edit" && projectDialog.project) {
      const updated = await updatePortfolioProject(portfolioId, projectDialog.project.id, values);
      onContentChange(updated);
      toast.success("Project updated.");
      return;
    }
    const updated = await addPortfolioProject(portfolioId, values);
    onContentChange(updated);
    toast.success("Project added.");
  }

  async function handleToggleProject(projectId: string, show: boolean) {
    const updated = await setPortfolioProjectVisibility(portfolioId, projectId, show);
    onContentChange(updated);
  }

  async function handleDeleteProject(projectId: string) {
    const updated = await deletePortfolioProject(portfolioId, projectId);
    onContentChange(updated);
    toast.success("Project removed.");
  }

  async function handleAddSkill() {
    const name = newSkill.trim();
    if (!name) return;
    const updated = await addPortfolioSkill(portfolioId, name);
    onContentChange(updated);
    setNewSkill("");
    toast.success("Skill added.");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "content" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("content")}
          >
            <List className="mr-1.5 size-4" /> Content
          </Button>
          <Button
            variant={mode === "design" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("design")}
          >
            <LayoutTemplate className="mr-1.5 size-4" /> Design
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Share portfolio"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  aria-label="Portfolio actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isDuplicating}
                onClick={() => {
                  setIsDuplicating(true);
                  void duplicatePortfolio(portfolioId)
                    .then((p) => {
                      toast.success("Portfolio duplicated.");
                      router.push(portfolioPath(p.id));
                    })
                    .finally(() => setIsDuplicating(false));
                }}
              >
                <Copy className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PortfolioShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        portfolioId={portfolioId}
        portfolioTitle={content.portfolio.title}
        portfolioSlug={content.portfolio.slug}
        username={publicUsername}
        onPortfolioSlugChange={(slug) =>
          onContentChange({
            ...content,
            portfolio: { ...content.portfolio, slug },
          })
        }
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          {mode === "design" ? (
            <PortfolioDesignSettings
              portfolioId={portfolioId}
              themeName={content.theme?.name ?? "Modern"}
              snapshot={design}
              savedSnapshot={savedDesign}
              onChange={(patch) => {
                setDesign((current) => ({ ...current, ...patch }));
                onPreviewSettingsChange?.(patch);
              }}
              onSaved={setSavedDesign}
            />
          ) : (
            <>
              <PortfolioProfileSection
                portfolioId={portfolioId}
                contactProfile={content.contactProfile}
                onSaved={onContentChange}
              />

              <section className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-medium">About</h2>
                <div className="mt-4 space-y-3">
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="One-line value proposition"
                  />
                  <Textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="2–4 sentences about who you are and what you build."
                    rows={4}
                  />
                  <Button size="sm" onClick={() => void handleSaveAbout()} disabled={savingAbout}>
                    {savingAbout ? "Saving…" : "Save about"}
                  </Button>
                </div>
              </section>

              <section className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium">Projects</h2>
                  <Button size="sm" onClick={() => setProjectDialog({ mode: "create" })}>
                    <Plus className="mr-1 size-4" /> Add
                  </Button>
                </div>
                <ul className="mt-4 space-y-2">
                  {content.projects.map((project) => (
                    <li
                      key={project.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2",
                        !project.showInPreview && "opacity-60"
                      )}
                    >
                      {project.featured ? <Star className="size-3.5 shrink-0 text-amber-500" /> : null}
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setProjectDialog({ mode: "edit", project })}
                      >
                        <p className="truncate text-sm font-medium">{project.title}</p>
                        {project.tagline ? (
                          <p className="truncate text-xs text-muted-foreground">{project.tagline}</p>
                        ) : null}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2"
                        onClick={() => void handleToggleProject(project.id, !project.showInPreview)}
                      >
                        {project.showInPreview ? (
                          <Eye className="mr-1 size-3.5" />
                        ) : (
                          <EyeOff className="mr-1 size-3.5" />
                        )}
                        {project.showInPreview ? "Hide" : "Show"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-destructive"
                        onClick={() => void handleDeleteProject(project.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </li>
                  ))}
                  {content.projects.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No projects yet, add 3–5 strong case studies.</p>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-medium">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {content.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                    >
                      {skill.name}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => void deletePortfolioSkill(portfolioId, skill.id).then(onContentChange)}
                        aria-label={`Remove ${skill.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => e.key === "Enter" && void handleAddSkill()}
                  />
                  <Button size="sm" variant="outline" onClick={() => void handleAddSkill()}>Add</Button>
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>

      <PortfolioProjectEditDialog
        state={projectDialog}
        onClose={() => setProjectDialog(null)}
        onSave={handleProjectSave}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete portfolio?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleting(true);
                void deletePortfolio(portfolioId)
                  .then(() => {
                    toast.success("Portfolio deleted.");
                    router.push("/portfolios");
                  })
                  .finally(() => setIsDeleting(false));
              }}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
