"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { TwinEntryCard } from "@/components/twin/twin-entry-card";
import { TwinEntryDialog } from "@/components/twin/twin-entry-dialog";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspacePanelScrollAreaFrame } from "@/components/layout/workspace-panel";
import {
  createTwinEntry,
  deleteTwinEntry,
  listTwinEntries,
  updateTwinEntry,
} from "@/lib/api/cv-api";
import type { TwinEntry, TwinEntryType } from "@/lib/types/twin";

interface TwinWorkspaceProps {
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}

export function TwinWorkspace({ addOpen = false, onAddOpenChange }: TwinWorkspaceProps) {
  const { refreshKey, setOpen } = useCvAssistant();
  const [entries, setEntries] = useState<TwinEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TwinEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TwinEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadEntries = useCallback(() => {
    void listTwinEntries().then(setEntries);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  useEffect(() => {
    if (addOpen) {
      setEditingEntry(null);
      setDialogOpen(true);
      onAddOpenChange?.(false);
    }
  }, [addOpen, onAddOpenChange]);

  function openEditDialog(entry: TwinEntry) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  async function handleSave(values: {
    type: TwinEntryType;
    title: string;
    body: string;
  }) {
    if (editingEntry) {
      const updated = await updateTwinEntry({
        id: editingEntry.id,
        type: values.type,
        title: values.title,
        body: values.body,
      });
      setEntries((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } else {
      const created = await createTwinEntry(values);
      setEntries((current) => [...current, created]);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const deleted = await deleteTwinEntry(id);
      if (deleted) {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        toast.success("Entry deleted");
        setDeleteTarget(null);
      } else {
        toast.error("Could not delete this entry. Try again.");
      }
    } catch {
      toast.error("Could not delete this entry. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Tell Yuse about a job, project, or skill, it will ask follow-ups and save the
            details here automatically.
          </p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}>
            <MessageCircle className="size-3.5" />
            Start with Yuse
          </Button>
        </div>
      ) : (
        <WorkspacePanelScrollAreaFrame className="max-h-[calc(100dvh-18rem)]">
          <ScrollArea className="h-full max-h-[calc(100dvh-18rem)] pr-3">
            <ul className="grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <TwinEntryCard
                    entry={entry}
                    onEdit={() => openEditDialog(entry)}
                    onDeleteRequest={() => setDeleteTarget(entry)}
                  />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </WorkspacePanelScrollAreaFrame>
      )}

      <TwinEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        onSave={handleSave}
      />

      <ResponsiveDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <ResponsiveDialogContent showCloseButton={!isDeleting}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete this entry?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" will be removed from your Digital Twin permanently. This cannot be undone.`
                : "This entry will be removed permanently. This cannot be undone."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="warning"
              disabled={!deleteTarget || isDeleting}
              onClick={() => {
                if (deleteTarget) void handleDelete(deleteTarget.id);
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
