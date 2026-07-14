"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
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
import { PortfolioWorkspaceToolbar, type PortfolioWorkspaceMode } from "@/components/portfolio/portfolio-workspace-toolbar";
import { PortfolioProfileSection } from "@/components/portfolio/portfolio-profile-section";
import {
  PortfolioProjectEditDialog,
  type ProjectDialogState,
} from "@/components/portfolio/portfolio-project-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { PortfolioShareDialog } from "@/components/portfolio/portfolio-share-dialog";
import { EditableFieldRow } from "@/components/settings/editable-field-row";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspacePanelScrollAreaFrame } from "@/components/layout/workspace-panel";
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
import { useRegisterPreviewDrawerActions } from "@/components/layout/workspace-preview-registration";
import {
  WorkspaceSection,
  WorkspaceSections,
  workspaceRowActionButtonClassName,
  workspaceRowClassName,
  workspaceRowHiddenClassName,
  workspaceRowListClassName,
} from "@/components/layout/workspace-section";
import { cn } from "@/lib/utils";

type WorkspaceMode = PortfolioWorkspaceMode;

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

  const previewDrawerActions = useMemo(
    () => ({
      onShare: () => setShareOpen(true),
      shareLabel: "Share portfolio",
    }),
    []
  );
  useRegisterPreviewDrawerActions(previewDrawerActions);

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
      <PortfolioWorkspaceToolbar
        mode={mode}
        onModeChange={setMode}
        onShare={() => setShareOpen(true)}
        onDuplicate={() => {
          setIsDuplicating(true);
          void duplicatePortfolio(portfolioId)
            .then((p) => {
              toast.success("Portfolio duplicated.");
              router.push(portfolioPath(p.id));
            })
            .finally(() => setIsDuplicating(false));
        }}
        onDeleteRequest={() => setDeleteOpen(true)}
        isDuplicating={isDuplicating}
      />

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

      <WorkspacePanelScrollAreaFrame>
      <ScrollArea className="min-h-0 flex-1">
        <WorkspaceSections>
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

              <WorkspaceSection title="About">
                <EditableFieldRow
                  label="Tagline"
                  value={tagline}
                  placeholder="One-line value proposition"
                  emptyValueLabel="Add a tagline"
                  onSave={async (next) => {
                    await updatePortfolio(portfolioId, { tagline: next, about });
                    setTagline(next);
                    onContentChange({
                      ...content,
                      portfolio: { ...content.portfolio, tagline: next },
                    });
                    toast.success("Tagline saved.");
                  }}
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
              </WorkspaceSection>

              <WorkspaceSection
                title="Projects"
                actions={
                  <Button size="sm" onClick={() => setProjectDialog({ mode: "create" })}>
                    <Plus className="mr-1 size-4" /> Add
                  </Button>
                }
                bodyClassName="pb-2"
              >
                <ul className={workspaceRowListClassName}>
                  {content.projects.map((project) => (
                    <li
                      key={project.id}
                      className={cn("flex items-center gap-2", workspaceRowClassName)}
                    >
                      {project.featured ? <Star className="size-3.5 shrink-0 text-amber-500" /> : null}
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 flex-1 text-left",
                          !project.showInPreview && workspaceRowHiddenClassName
                        )}
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
                        className={cn("h-8 shrink-0 px-2", workspaceRowActionButtonClassName)}
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
                        className="h-8 shrink-0 px-2 text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteProject(project.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </li>
                  ))}
                  {content.projects.length === 0 ? (
                    <li className="px-4 py-6 text-center text-xs text-muted-foreground lg:px-5">
                      No projects yet, add 3–5 strong case studies.
                    </li>
                  ) : null}
                </ul>
              </WorkspaceSection>

              <WorkspaceSection title="Skills">
                <div className="flex flex-wrap gap-2">
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
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => e.key === "Enter" && void handleAddSkill()}
                  />
                  <Button size="sm" variant="outline" onClick={() => void handleAddSkill()}>Add</Button>
                </div>
              </WorkspaceSection>
            </>
          )}
        </WorkspaceSections>
      </ScrollArea>
      </WorkspacePanelScrollAreaFrame>

      <PortfolioProjectEditDialog
        state={projectDialog}
        onClose={() => setProjectDialog(null)}
        onSave={handleProjectSave}
      />

      <ResponsiveDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ResponsiveDialogContent showCloseButton={!isDeleting}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete portfolio?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>This cannot be undone.</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
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
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
