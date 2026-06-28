"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function renderInline(text: string): ReactNode[] {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.flatMap((part, partIndex) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`b-${partIndex}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const italicParts = part.split(/(\*[^*]+\*|_[^_]+_)/g);
    return italicParts.map((sub, subIndex) => {
      const isItalic =
        (sub.startsWith("*") && sub.endsWith("*") && sub.length > 2) ||
        (sub.startsWith("_") && sub.endsWith("_") && sub.length > 2);
      if (isItalic) {
        return <em key={`i-${partIndex}-${subIndex}`}>{sub.slice(1, -1)}</em>;
      }
      return <Fragment key={`t-${partIndex}-${subIndex}`}>{sub}</Fragment>;
    });
  });
}

function parseListBlock(lines: string[], ordered: boolean) {
  const items = lines.map((line, index) => {
    const content = ordered
      ? line.replace(/^\d+\.\s+/, "")
      : line.replace(/^[-*]\s+/, "");
    return (
      <li key={index} className="leading-relaxed">
        {renderInline(content)}
      </li>
    );
  });

  if (ordered) {
    return <ol className="my-1 list-decimal space-y-0.5 pl-5">{items}</ol>;
  }
  return <ul className="my-1 list-disc space-y-0.5 pl-5">{items}</ul>;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "");
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={cn("space-y-2 leading-relaxed", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

        if (isBulletList) {
          return <Fragment key={blockIndex}>{parseListBlock(lines, false)}</Fragment>;
        }
        if (isNumberedList) {
          return <Fragment key={blockIndex}>{parseListBlock(lines, true)}</Fragment>;
        }

        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
