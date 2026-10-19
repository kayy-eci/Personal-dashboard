import test from "node:test";
import assert from "node:assert/strict";
import {
  isMarkdownText,
  markdownToContent,
} from "../dist-electron/lib/markdown-paste.js";

test("converts markdown headings to heading blocks", () => {
  assert.deepEqual(markdownToContent("# Title"), [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Title" }] }],
    },
  ]);
  assert.equal(markdownToContent("### Deep note")[0].attrs.level, 3);
  // Four hashes stay plain text.
  assert.equal(markdownToContent("#too many hashes"), null);
});

test("converts bulleted, ordered and to-do lists into list blocks", () => {
  const bullets = markdownToContent("- first\n- second");
  assert.equal(bullets.length, 1);
  assert.equal(bullets[0].type, "bulletList");
  assert.equal(bullets[0].content.length, 2);
  assert.equal(bullets[0].content[0].content[0].content[0].text, "first");

  const ordered = markdownToContent("1. one\n2) two");
  assert.equal(ordered[0].type, "orderedList");

  const todos = markdownToContent("[] unchecked\n[x] done");
  assert.equal(todos[0].type, "taskList");
  assert.equal(todos[0].content.length, 2);
  assert.equal(todos[0].content[0].attrs.checked, false);
  assert.equal(todos[0].content[1].attrs.checked, true);
});

test("merges consecutive quote lines into one blockquote", () => {
  const quoted = markdownToContent("> first\n> second\n>third");
  assert.equal(quoted.length, 1);
  assert.equal(quoted[0].type, "blockquote");
  assert.equal(quoted[0].content.length, 3);
});

test("converts fenced code blocks with language and dividers", () => {
  const fenced = markdownToContent("```ts\nconst x = 1;\nconst y = 2;\n```");
  assert.equal(fenced.length, 1);
  assert.equal(fenced[0].type, "codeBlock");
  assert.equal(fenced[0].attrs.language, "ts");
  assert.equal(
    fenced[0].content[0].content[0].text,
    "const x = 1;\nconst y = 2;",
  );

  const divider = markdownToContent("Above\n---\nBelow");
  assert.equal(divider.length, 3);
  assert.equal(divider[1].type, "horizontalRule");
  assert.equal(divider[0].type, "paragraph");
  assert.equal(divider[2].type, "paragraph");

  // A code block survives a divider-looking line inside its fence.
  const guarded = markdownToContent("```\ncode\n---\n```");
  assert.equal(guarded.length, 1);
  assert.equal(guarded[0].type, "codeBlock");
});

test("plain paragraphs pasted without markers stay unconverted", () => {
  assert.equal(markdownToContent("line one\nline two\nline three"), null);
  assert.equal(markdownToContent(""), null);
  assert.equal(markdownToContent("line one\nline two"), null);
  assert.equal(isMarkdownText("just prose"), false);
});

test("mixed markdown content round-trips all constructs in order", () => {
  const text = "# Plan\n\n- buy milk\n\n[] call the bank\n\nplain sentence";
  const blocks = markdownToContent(text);
  assert.deepEqual(
    blocks.map(({ type }) => type),
    ["heading", "bulletList", "taskList", "paragraph"],
  );
  assert.equal(blocks[3].content[0].text, "plain sentence");
});
