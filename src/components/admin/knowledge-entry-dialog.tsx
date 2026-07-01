"use client";

import { useEffect, useState } from "react";
import type { KnowledgeEntry } from "@/lib/types/knowledge";
import {
  ASSISTANT_CATEGORIES,
  CATEGORY_LABELS,
  type AssistantCategory,
  type CreateKnowledgeEntryInput,
} from "@/lib/types/knowledge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface KnowledgeEntryDialogState {
  mode: "create" | "edit";
  entry?: KnowledgeEntry;
}

interface KnowledgeEntryDialogProps {
  state: KnowledgeEntryDialogState | null;
  onClose: () => void;
  onSave: (values: CreateKnowledgeEntryInput & { id?: string }) => Promise<void>;
}

export function KnowledgeEntryDialog({ state, onClose, onSave }: KnowledgeEntryDialogProps) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AssistantCategory>("ADVICE");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    const entry = state.entry;
    setSlug(entry?.slug ?? "");
    setTitle(entry?.title ?? "");
    setCategory(entry?.category ?? "ADVICE");
    setTags(entry?.tags?.join(", ") ?? "");
    setBody(entry?.body ?? "");
    setEnabled(entry?.enabled ?? true);
  }, [state]);

  if (!state) return null;

  async function handleSubmit() {
    const trimmedSlug = slug.trim();
    const trimmedTitle = title.trim();
    if (!trimmedSlug || !trimmedTitle) return;

    setSaving(true);
    try {
      await onSave({
        id: state?.entry?.id,
        slug: trimmedSlug,
        title: trimmedTitle,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        body: body.trim(),
        enabled,
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
          <DialogTitle>
            {state.mode === "create" ? "Add knowledge entry" : "Edit knowledge entry"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="knowledge-slug" className="text-sm font-medium">
              Slug
            </label>
            <Input
              id="knowledge-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="resume-formatting-tips"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="knowledge-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="knowledge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="knowledge-category" className="text-sm font-medium">
              Category
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as AssistantCategory)}>
              <SelectTrigger id="knowledge-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSISTANT_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="knowledge-tags" className="text-sm font-medium">
              Tags (comma-separated)
            </label>
            <Input
              id="knowledge-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="resume, formatting"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="knowledge-body" className="text-sm font-medium">
              Body
            </label>
            <Textarea
              id="knowledge-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Guidance the assistant should follow when this entry matches."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Enabled
          </label>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : state.mode === "create" ? "Add entry" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
