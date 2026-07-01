"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  KnowledgeEntryDialog,
  type KnowledgeEntryDialogState,
} from "@/components/admin/knowledge-entry-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry,
} from "@/lib/api/admin-api";
import { CATEGORY_LABELS, type KnowledgeEntry } from "@/lib/types/knowledge";
import { cn } from "@/lib/utils";

export function KnowledgeDictionary() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<KnowledgeEntryDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listKnowledgeEntries(true);
      setEntries(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load knowledge entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleSave(values: {
    id?: string;
    slug: string;
    title: string;
    category: KnowledgeEntry["category"];
    tags: string[];
    body: string;
    enabled: boolean;
  }) {
    try {
      if (values.id) {
        await updateKnowledgeEntry({
          id: values.id,
          slug: values.slug,
          title: values.title,
          category: values.category,
          tags: values.tags,
          body: values.body,
          enabled: values.enabled,
        });
        toast.success("Entry updated");
      } else {
        await createKnowledgeEntry({
          slug: values.slug,
          title: values.title,
          category: values.category,
          tags: values.tags,
          body: values.body,
          enabled: values.enabled,
        });
        toast.success("Entry added");
      }
      await loadEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this entry.");
      throw err;
    }
  }

  async function handleToggleEnabled(entry: KnowledgeEntry) {
    setTogglingId(entry.id);
    try {
      await updateKnowledgeEntry({ id: entry.id, enabled: !entry.enabled });
      await loadEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update this entry.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKnowledgeEntry(deleteTarget.id);
      toast.success("Entry deleted");
      setDeleteTarget(null);
      await loadEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this entry.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" />
              Knowledge dictionary
            </CardTitle>
            <CardDescription>
              Curated guidance Yuse can pull in when a message matches an entry.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogState({ mode: "create" })}
          >
            <Plus className="size-4" />
            Add entry
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Loading entries…
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-16 text-center">
              <p className="text-sm font-medium">No entries yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add guidance the assistant can use when messages match.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Tags</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">{entry.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.slug}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{CATEGORY_LABELS[entry.category]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {entry.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={togglingId === entry.id}
                            onClick={() => void handleToggleEnabled(entry)}
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                              entry.enabled
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {entry.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${entry.title}`}
                              onClick={() => setDialogState({ mode: "edit", entry })}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Delete ${entry.title}`}
                              onClick={() => setDeleteTarget(entry)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <KnowledgeEntryDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
      />

      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entry?</DialogTitle>
            <DialogDescription>
              This removes &ldquo;{deleteTarget?.title}&rdquo; from the knowledge dictionary. The
              assistant will no longer use this guidance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
