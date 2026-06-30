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

function parseListBlock(
  lines: string[],
  ordered: boolean,
  bulletMarker?: string
) {
  const items = lines.map((line, index) => {
    const content = ordered
      ? line.replace(/^\d+\.\s+/, "")
      : line.replace(/^[-*]\s+/, "");
    return (
      <li
        key={index}
        className={cn("leading-relaxed", bulletMarker && "list-none pl-0")}
        style={
          bulletMarker
            ? {
                display: "flex",
                gap: "0.35em",
              }
            : undefined
        }
      >
        {bulletMarker ? (
          <span aria-hidden className="shrink-0 select-none">
            {bulletMarker}
          </span>
        ) : null}
        <span>{renderInline(content)}</span>
      </li>
    );
  });

  if (ordered) {
    return <ol className="my-1 list-decimal space-y-0.5 pl-5">{items}</ol>;
  }
  return (
    <ul
      className={cn(
        "my-1 space-y-0.5",
        bulletMarker ? "list-none pl-0" : "list-disc pl-5"
      )}
    >
      {items}
    </ul>
  );
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
  /** When "PARAGRAPH", bullet lines render as plain paragraphs. */
  descriptionStyle?: "BULLETS" | "PARAGRAPH";
  bulletMarker?: string;
}

export function MarkdownContent({
  content,
  className,
  descriptionStyle = "BULLETS",
  bulletMarker,
}: MarkdownContentProps) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={cn("space-y-2 leading-relaxed", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletList =
          descriptionStyle === "BULLETS" &&
          lines.every((line) => /^[-*]\s+/.test(line.trim()));
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

        if (isBulletList) {
          return (
            <Fragment key={blockIndex}>
              {parseListBlock(lines, false, bulletMarker)}
            </Fragment>
          );
        }
        if (isNumberedList) {
          return <Fragment key={blockIndex}>{parseListBlock(lines, true)}</Fragment>;
        }

        const paragraphLines =
          descriptionStyle === "PARAGRAPH"
            ? lines.map((line) => line.replace(/^[-*]\s+/, ""))
            : lines;

        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {paragraphLines.map((line, lineIndex) => (
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
