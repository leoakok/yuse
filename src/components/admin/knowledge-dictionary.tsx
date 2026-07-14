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
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  WorkspaceSection,
} from "@/components/layout/workspace-section";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry,
} from "@/lib/api/admin-api";
import { CATEGORY_LABELS, type KnowledgeEntry } from "@/lib/types/knowledge";

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
      <WorkspaceSection
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="size-4" />
            Knowledge dictionary
          </span>
        }
        description="Curated guidance Yuse can pull in when a message matches an entry."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogState({ mode: "create" })}
          >
            <Plus className="size-4" />
            Add entry
          </Button>
        }
        bodyClassName="pb-0"
      >
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
            <DataTable minWidth="760px">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Title</DataTableHead>
                  <DataTableHead>Slug</DataTableHead>
                  <DataTableHead>Category</DataTableHead>
                  <DataTableHead>Tags</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {entries.map((entry) => (
                  <DataTableRow key={entry.id}>
                    <DataTableCell className="font-medium">{entry.title}</DataTableCell>
                    <DataTableCell muted>{entry.slug}</DataTableCell>
                    <DataTableCell>
                      <Badge variant="secondary">{CATEGORY_LABELS[entry.category]}</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {entry.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={togglingId === entry.id}
                        onClick={() => void handleToggleEnabled(entry)}
                      >
                        {entry.enabled ? "Enabled" : "Disabled"}
                      </Button>
                    </DataTableCell>
                    <DataTableCell className="text-right">
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
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
      </WorkspaceSection>

      <KnowledgeEntryDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        onSave={handleSave}
      />

      <ResponsiveDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete entry?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This removes &ldquo;{deleteTarget?.title}&rdquo; from the knowledge dictionary. The
              assistant will no longer use this guidance.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
