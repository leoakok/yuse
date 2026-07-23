"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  createCuratedTheme,
  deleteCuratedTheme,
  listAdminCuratedThemes,
  updateCuratedTheme,
} from "@/lib/api/admin-api";
import { buildDesignShareUrl } from "@/lib/design/public-api";
import type { CuratedTheme } from "@/lib/types/design-share";

export function AdminThemesPanel() {
  const [themes, setThemes] = useState<CuratedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [tags, setTags] = useState("");
  const [featuredOnLanding, setFeaturedOnLanding] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setThemes(await listAdminCuratedThemes());
    } catch {
      setError("Could not load themes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await createCuratedTheme({
        title: title.trim(),
        designUrl: designUrl.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        featuredOnLanding,
        isPublic,
      });
      setThemes((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setTitle("");
      setDesignUrl("");
      setTags("");
      setFeaturedOnLanding(false);
      setIsPublic(false);
      toast.success("Theme added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add theme.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleField(
    theme: CuratedTheme,
    field: "featuredOnLanding" | "isPublic",
  ) {
    setBusyId(theme.id);
    try {
      const updated = await updateCuratedTheme({
        id: theme.id,
        [field]: !theme[field],
      });
      setThemes((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      toast.error("Could not update theme.");
    } finally {
      setBusyId(null);
    }
  }

  async function moveTheme(theme: CuratedTheme, direction: -1 | 1) {
    const index = themes.findIndex((row) => row.id === theme.id);
    const swap = themes[index + direction];
    if (!swap) return;

    setBusyId(theme.id);
    try {
      const [a, b] = await Promise.all([
        updateCuratedTheme({ id: theme.id, sortOrder: swap.sortOrder }),
        updateCuratedTheme({ id: swap.id, sortOrder: theme.sortOrder }),
      ]);
      setThemes((current) => {
        const next = current.map((row) => {
          if (row.id === a.id) return a;
          if (row.id === b.id) return b;
          return row;
        });
        return next.sort((left, right) => left.sortOrder - right.sortOrder);
      });
    } catch {
      toast.error("Could not reorder themes.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(theme: CuratedTheme) {
    setBusyId(theme.id);
    try {
      await deleteCuratedTheme(theme.id);
      setThemes((current) => current.filter((row) => row.id !== theme.id));
      toast.success("Theme removed.");
    } catch {
      toast.error("Could not delete theme.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Themes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add design share links to feature on the landing page or in the public theme picker.
        </p>
      </div>

      <form onSubmit={(event) => void handleCreate(event)} className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="theme-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="theme-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bold executive"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="theme-url" className="text-sm font-medium">
              Design URL
            </label>
            <Input
              id="theme-url"
              value={designUrl}
              onChange={(e) => setDesignUrl(e.target.value)}
              placeholder="yuse.one/d/abc123xyz"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="theme-tags" className="text-sm font-medium">
            Tags
          </label>
          <Input
            id="theme-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="bold, executive, serif"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={featuredOnLanding ? "default" : "outline"}
            size="sm"
            onClick={() => setFeaturedOnLanding((value) => !value)}
          >
            Feature on landing
          </Button>
          <Button
            type="button"
            variant={isPublic ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPublic((value) => !value)}
          >
            Public theme
          </Button>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add theme"}
        </Button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Loading themes...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error ? (
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>Title</DataTableHead>
              <DataTableHead>Link</DataTableHead>
              <DataTableHead>Tags</DataTableHead>
              <DataTableHead>Landing</DataTableHead>
              <DataTableHead>Public</DataTableHead>
              <DataTableHead className="text-right">Actions</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {themes.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={6} className="text-muted-foreground">
                  No curated themes yet.
                </DataTableCell>
              </DataTableRow>
            ) : (
              themes.map((theme, index) => (
                <DataTableRow key={theme.id}>
                  <DataTableCell className="font-medium">{theme.title}</DataTableCell>
                  <DataTableCell>
                    <a
                      href={buildDesignShareUrl(theme.urlPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {theme.urlPath}
                    </a>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-1">
                      {theme.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      type="button"
                      variant={theme.featuredOnLanding ? "default" : "outline"}
                      size="sm"
                      disabled={busyId === theme.id}
                      onClick={() => void toggleField(theme, "featuredOnLanding")}
                    >
                      {theme.featuredOnLanding ? "Yes" : "No"}
                    </Button>
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      type="button"
                      variant={theme.isPublic ? "default" : "outline"}
                      size="sm"
                      disabled={busyId === theme.id}
                      onClick={() => void toggleField(theme, "isPublic")}
                    >
                      {theme.isPublic ? "Yes" : "No"}
                    </Button>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busyId === theme.id || index === 0}
                        onClick={() => void moveTheme(theme, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busyId === theme.id || index === themes.length - 1}
                        onClick={() => void moveTheme(theme, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busyId === theme.id}
                        onClick={() => void handleDelete(theme)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      ) : null}
    </div>
  );
}
