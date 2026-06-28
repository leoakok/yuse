"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TwinEntry, TwinEntryType } from "@/lib/types/twin";
import {
  TWIN_ENTRY_TYPE_LABELS,
  TWIN_ENTRY_TYPES,
} from "@/lib/types/twin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RichTextEditor } from "@/components/cv/rich-text-editor";

interface TwinEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TwinEntry | null;
  onSave: (values: { type: TwinEntryType; title: string; body: string }) => Promise<void>;
}

export function TwinEntryDialog({
  open,
  onOpenChange,
  entry,
  onSave,
}: TwinEntryDialogProps) {
  const [type, setType] = useState<TwinEntryType>("EXPERIENCE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(entry);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setType(entry.type);
      setTitle(entry.title);
      setBody(entry.body);
    } else {
      setType("EXPERIENCE");
      setTitle("");
      setBody("");
    }
  }, [open, entry]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setIsSaving(true);
    try {
      await onSave({ type, title: trimmedTitle, body: body.trim() });
      onOpenChange(false);
      toast.success(isEditing ? "Entry updated" : "Entry added");
    } catch {
      toast.error("Could not save this entry. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details stored in your Digital Twin."
              : "Capture a full story — roles, education, projects, or skills — with as much detail as you like."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="twin-entry-type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (value) setType(value as TwinEntryType);
              }}
            >
              <SelectTrigger id="twin-entry-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TWIN_ENTRY_TYPES.map((entryType) => (
                  <SelectItem key={entryType} value={entryType}>
                    {TWIN_ENTRY_TYPE_LABELS[entryType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="twin-entry-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="twin-entry-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Staff Engineer at Acme Corp"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="twin-entry-body" className="text-sm font-medium">
              Full story
            </label>
            <RichTextEditor
              id="twin-entry-body"
              value={body}
              onChange={setBody}
              placeholder="Write everything you remember — outcomes, technologies, team size, context. The more detail, the better tailored your future resumes can be."
              rows={10}
              className="min-h-[200px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Add entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
