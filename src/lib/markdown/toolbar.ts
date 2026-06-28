export interface SelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function resolveSelection(value: string, selectionStart: number, selectionEnd: number) {
  if (selectionStart !== selectionEnd) {
    return { start: selectionStart, end: selectionEnd, selected: value.slice(selectionStart, selectionEnd) };
  }

  const position = selectionStart;
  let start = position;
  let end = position;
  while (start > 0 && /\S/.test(value[start - 1]!)) start--;
  while (end < value.length && /\S/.test(value[end]!)) end++;

  if (start < end) {
    return { start, end, selected: value.slice(start, end) };
  }

  return { start: position, end: position, selected: "text" };
}

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string
): SelectionEdit {
  const { start, end, selected } = resolveSelection(value, selectionStart, selectionEnd);
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  const nextStart = start + before.length;
  const nextEnd = nextStart + selected.length;
  return { value: newValue, selectionStart: nextStart, selectionEnd: nextEnd };
}

export function applyBold(
  value: string,
  selectionStart: number,
  selectionEnd: number
): SelectionEdit {
  return wrapSelection(value, selectionStart, selectionEnd, "**", "**");
}

export function applyItalic(
  value: string,
  selectionStart: number,
  selectionEnd: number
): SelectionEdit {
  return wrapSelection(value, selectionStart, selectionEnd, "*", "*");
}

function getLineRange(value: string, position: number) {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  const nextNewline = value.indexOf("\n", position);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  return { lineStart, lineEnd };
}

function getAffectedLines(value: string, selectionStart: number, selectionEnd: number) {
  const startLine = getLineRange(value, selectionStart);
  const endLine = getLineRange(value, selectionEnd);
  const block = value.slice(startLine.lineStart, endLine.lineEnd);
  const lines = block.split("\n");
  return { startLine, endLine, lines };
}

function toggleLinePrefix(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  bullet: boolean
): SelectionEdit {
  const { startLine, endLine, lines } = getAffectedLines(value, selectionStart, selectionEnd);
  const bulletPattern = /^[-*]\s+/;
  const numberedPattern = /^\d+\.\s+/;

  const allBullets = lines.every((line) => !line.trim() || bulletPattern.test(line));
  const allNumbered = lines.every((line) => !line.trim() || numberedPattern.test(line));

  const transformed = lines.map((line, index) => {
    if (!line.trim()) return line;
    if (bullet) {
      if (allBullets) return line.replace(bulletPattern, "");
      const stripped = line.replace(bulletPattern, "").replace(numberedPattern, "");
      return `- ${stripped}`;
    }
    if (allNumbered) return line.replace(numberedPattern, "");
    const stripped = line.replace(bulletPattern, "").replace(numberedPattern, "");
    return `${index + 1}. ${stripped}`;
  });

  const newBlock = transformed.join("\n");
  const newValue = value.slice(0, startLine.lineStart) + newBlock + value.slice(endLine.lineEnd);
  const newEnd = startLine.lineStart + newBlock.length;
  return {
    value: newValue,
    selectionStart: startLine.lineStart,
    selectionEnd: newEnd,
  };
}

export function applyBulletList(
  value: string,
  selectionStart: number,
  selectionEnd: number
): SelectionEdit {
  return toggleLinePrefix(value, selectionStart, selectionEnd, true);
}

export function applyNumberedList(
  value: string,
  selectionStart: number,
  selectionEnd: number
): SelectionEdit {
  return toggleLinePrefix(value, selectionStart, selectionEnd, false);
}
