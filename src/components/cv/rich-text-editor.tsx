"use client";

import { useCallback, useRef, type MouseEvent } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  applyBold,
  applyBulletList,
  applyItalic,
  applyNumberedList,
  type SelectionEdit,
} from "@/lib/markdown/toolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  id,
  className,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectionRef = useRef({ start: 0, end: 0 });

  const syncSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }, []);

  const applyFormat = useCallback(
    (action: (value: string, start: number, end: number) => SelectionEdit) => {
      const el = textareaRef.current;
      if (!el) return;
      const { start, end } = selectionRef.current;
      const result = action(value, start, end);
      onChange(result.value);
      selectionRef.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
      };
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [value, onChange]
  );

  const keepFocus = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-input", className)}>
      <div
        className="flex items-center gap-0.5 border-b border-input bg-muted/30 px-1 py-0.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bold"
          onMouseDown={keepFocus}
          onClick={() => applyFormat(applyBold)}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Italic"
          onMouseDown={keepFocus}
          onClick={() => applyFormat(applyItalic)}
        >
          <Italic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bullet list"
          onMouseDown={keepFocus}
          onClick={() => applyFormat(applyBulletList)}
        >
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Numbered list"
          onMouseDown={keepFocus}
          onClick={() => applyFormat(applyNumberedList)}
        >
          <ListOrdered />
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={syncSelection}
        onKeyUp={syncSelection}
        onMouseUp={syncSelection}
        onFocus={syncSelection}
        placeholder={placeholder}
        rows={rows}
        className="min-h-0 rounded-none border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}
