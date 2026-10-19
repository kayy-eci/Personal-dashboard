/**
 * FR-1.9: markdown paste becomes blocks. This module is pure (no DOM) so it
 * stays unit-testable in Node: it maps pasted plain text onto Tiptap node JSON
 * and returns null when the text holds no markdown constructs, leaving the
 * default paste behaviour (plain paragraphs) untouched.
 */

export type MarkdownNode = Record<string, unknown>;

const bulletPattern = /^\s{0,3}[-*]\s+(.*)$/;
const orderedPattern = /^\s{0,3}\d+[.)]\s+(.*)$/;
const toDoPattern = /^\s{0,3}\[\s?([xX]|\s)?\]\s+(.*)$/;
const quotePattern = /^\s{0,3}>\s?(.*)$/;
const headingPattern = /^\s{0,3}(#{1,3})\s+(.*)$/;
const dividerPattern = /^\s{0,3}(?:-{3,}|\*{3,})\s*$/;
const fencePattern = /^\s{0,3}```(\S*)\s*$/;

type GroupKind = "bullets" | "ordered" | "todos" | "quotes";

interface Group {
  kind: GroupKind;
  items: MarkdownNode[];
}

function textContent(text: string): MarkdownNode[] | undefined {
  return text ? [{ type: "text", text }] : undefined;
}

/** Paragraph with the given inline text, kept Tiptap-JSON-shaped. */
function paragraph(text: string): MarkdownNode {
  const node: MarkdownNode = { type: "paragraph" };
  const content = textContent(text);
  if (content) {
    node.content = content;
  }
  return node;
}

function joinLines(lines: string[]): string {
  const joined = lines.join("\n").replace(/\s+$/, "");
  return joined;
}

function wrapGroup(group: Group): MarkdownNode | null {
  switch (group.kind) {
    case "bullets":
      return {
        type: "bulletList",
        content: group.items.map((item) => ({
          type: "listItem",
          content: [item],
        })),
      };
    case "ordered":
      return {
        type: "orderedList",
        content: group.items.map((item) => ({
          type: "listItem",
          content: [item],
        })),
      };
    case "todos":
      return { type: "taskList", content: group.items };
    case "quotes":
      return { type: "blockquote", content: group.items };
    default:
      return null;
  }
}

/** True when any line carries a markdown block construct worth converting. */
export function isMarkdownText(text: string): boolean {
  return text
    .split(/\r\n|\r|\n/)
    .some((line) =>
      [
        headingPattern,
        bulletPattern,
        orderedPattern,
        toDoPattern,
        quotePattern,
        dividerPattern,
        fencePattern,
      ].some((pattern) => pattern.test(line)),
    );
}

/**
 * Converts markdown plain text into Tiptap node JSON (an array so the result
 * pastes at the cursor) or null when the text is not markdown.
 */
export function markdownToContent(text: string): MarkdownNode[] | null {
  if (!text.trim()) {
    return null;
  }

  const lines = text.split(/\r\n|\r|\n/);
  if (!lines.some(isBlockMarkerLine)) {
    return null;
  }

  const blocks: MarkdownNode[] = [];
  let buffer: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let group: Group | null = null;

  const flushParagraph = (): void => {
    if (buffer.length > 0) {
      blocks.push(paragraph(joinLines(buffer)));
      buffer = [];
    }
  };

  const flushGroup = (): void => {
    if (group) {
      const wrapped = wrapGroup(group);
      if (wrapped) {
        blocks.push(wrapped);
      }
      group = null;
    }
  };

  const openGroup = (kind: GroupKind): void => {
    flushParagraph();
    if (!group || group.kind !== kind) {
      flushGroup();
      group = { kind, items: [] };
    }
  };

  const flushAll = (): void => {
    flushGroup();
    flushParagraph();
  };

  lines.forEach((rawLine) => {
    if (inCode) {
      if (fencePattern.test(rawLine)) {
        blocks.push(
          codeBlock(codeLanguage, joinLines(buffer)),
        );
        buffer = [];
        inCode = false;
        codeLanguage = "";
      } else {
        buffer.push(rawLine);
      }
      return;
    }

    const fence = fencePattern.exec(rawLine);
    if (fence) {
      flushAll();
      inCode = true;
      codeLanguage = fence[1];
      return;
    }

    if (rawLine.trim() === "") {
      flushAll();
      return;
    }

    const heading = headingPattern.exec(rawLine);
    if (heading) {
      flushAll();
      blocks.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: [paragraph(heading[2].trim())],
      });
      return;
    }

    if (dividerPattern.test(rawLine)) {
      flushAll();
      blocks.push({ type: "horizontalRule" });
      return;
    }

    const toDo = toDoPattern.exec(rawLine);
    if (toDo) {
      openGroup("todos");
      group!.items.push({
        type: "taskListItem",
        attrs: { checked: (toDo[1] ?? "").toLowerCase() === "x" },
        content: [paragraph(toDo[2].trim())],
      });
      return;
    }

    const bullet = bulletPattern.exec(rawLine);
    if (bullet) {
      openGroup("bullets");
      group!.items.push(paragraph(bullet[1].trim()));
      return;
    }

    const ordered = orderedPattern.exec(rawLine);
    if (ordered) {
      openGroup("ordered");
      group!.items.push(paragraph(ordered[1].trim()));
      return;
    }

    const quote = quotePattern.exec(rawLine);
    if (quote) {
      openGroup("quotes");
      group!.items.push(paragraph(quote[1].trim()));
      return;
    }

    flushGroup();
    buffer.push(rawLine);
  });

  if (inCode) {
    // Unterminated fence: treat the remainder as a code block.
    blocks.push(codeBlock(codeLanguage, joinLines(buffer)));
    buffer = [];
  }

  flushAll();

  return blocks.length > 0 ? blocks : null;
}

function codeBlock(language: string, code: string): MarkdownNode {
  const node: MarkdownNode = {
    type: "codeBlock",
    attrs: { language: language || null },
  };
  const content = code ? [paragraph(code)] : undefined;
  if (content) {
    node.content = content;
  }
  return node;
}

function isBlockMarkerLine(line: string): boolean {
  return (
    headingPattern.test(line) ||
    bulletPattern.test(line) ||
    orderedPattern.test(line) ||
    toDoPattern.test(line) ||
    quotePattern.test(line) ||
    dividerPattern.test(line) ||
    fencePattern.test(line)
  );
}
