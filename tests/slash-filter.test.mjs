import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterSlashItems,
  fuzzyMatchScore,
} from "../dist-electron/lib/slash-filter.js";

const items = [
  { id: "heading-1", label: "Heading 1", description: "Section heading (large)", aliases: ["h1"] },
  { id: "heading-2", label: "Heading 2", description: "Subsection heading (medium)", aliases: ["h2"] },
  { id: "bullet-list", label: "Bulleted list", description: "Simple list items", aliases: ["ul"] },
  { id: "numbered-list", label: "Numbered list", description: "List with numbering", aliases: ["ol"] },
  { id: "quote", label: "Quote", description: "Capture a quotation", aliases: ["bq", "blockquote"] },
  { id: "code-block", label: "Code block", description: "Code with syntax highlighting" },
  { id: "divider", label: "Divider", description: "Visually separate sections", aliases: ["hr"] },
  { id: "image", label: "Image", description: "Insert an image file", aliases: ["img"] },
];

function ids(list) {
  return list.map((item) => item.id);
}

test("query kosong mengembalikan semua item sesuai urutan asli", () => {
  assert.deepEqual(ids(filterSlashItems(items, "")), ids(items));
  assert.deepEqual(ids(filterSlashItems(items, "   ")), ids(items));
});

test("alias cocok persis dan jadi urutan pertama", () => {
  assert.equal(ids(filterSlashItems(items, "h2"))[0], "heading-2");
  assert.equal(ids(filterSlashItems(items, "hr"))[0], "divider");
  assert.equal(ids(filterSlashItems(items, "img"))[0], "image");
});

test("fuzzy subsequence: huruf tunggal acak tetap menemukan item", () => {
  // "b" → word start of "Bulleted list" beats mid-string matches.
  assert.equal(ids(filterSlashItems(items, "b"))[0], "bullet-list");
  // "ud" is a subsequence of "Numbered list".
  const numbered = filterSlashItems(items, "ud");
  assert.ok(numbered.some((item) => item.id === "numbered-list"));
});

test("pencocokan awal kata diutamakan di atas potongan tengah", () => {
  // "code" should rank "Code block" (word start) above any description's
  // "code with..." text, and it does appear first.
  assert.equal(ids(filterSlashItems(items, "code"))[0], "code-block");
});

test("deskripsi tetap bisa dicocokkan", () => {
  const found = filterSlashItems(items, "checkboxes");
  assert.equal(found.length, 0); // deskripsi lama tidak lagi menyebut checkbox
  const syntax = filterSlashItems(items, "syntax");
  assert.deepEqual(ids(syntax), ["code-block"]);
});

test("multi-token: setiap token harus cocok", () => {
  assert.deepEqual(
    ids(filterSlashItems(items, "bul li")),
    ["bullet-list"],
  );
  assert.deepEqual(filterSlashItems(items, "bul plot"), []);
});

test("token tidak cocok mengembalikan daftar kosong", () => {
  assert.deepEqual(filterSlashItems(items, "zzzz"), []);
});

test("fuzzyMatchScore: null saat tidak cocok, skor urut dari kuat ke lemah", () => {
  assert.equal(fuzzyMatchScore("", "text"), null);
  assert.equal(fuzzyMatchScore("xyz", "bulleted"), null);
  const prefix = fuzzyMatchScore("bul", "bulleted");
  const middle = fuzzyMatchScore("let", "bulleted");
  const subseq = fuzzyMatchScore("bt", "bulleted");
  assert.ok(prefix > middle);
  assert.ok(middle > subseq);
  assert.ok(subseq !== null);
});

// FR-1.4: every slash item answers to its canonical short alias.
const aliasFixture = [
  { id: "page", label: "Page", description: "Create a sub-page", aliases: ["page"] },
  { id: "h1", label: "Heading 1", description: "Section heading (large)", aliases: ["h1", "big title"] },
  { id: "h2", label: "Heading 2", description: "Subsection heading (medium)", aliases: ["h2", "medium title"] },
  { id: "h3", label: "Heading 3", description: "Minor grouping (small)", aliases: ["h3", "small title"] },
  { id: "bullet", label: "Bulleted list", description: "Simple list items", aliases: ["ul", "bullet", "list"] },
  { id: "number", label: "Numbered list", description: "List with numbering", aliases: ["ol", "number"] },
  { id: "todo", label: "To-do list", description: "Track tasks with checkboxes", aliases: ["tdl", "todo", "task"] },
  { id: "quote", label: "Quote", description: "Capture a quotation", aliases: ["bq", "quote", "blockquote"] },
  { id: "callout", label: "Callout", description: "Highlighted note", aliases: ["callout", "note", "highlight"] },
  { id: "code", label: "Code block", description: "Code with syntax highlighting", aliases: ["code", "snippet"] },
  { id: "divider", label: "Divider", description: "Visually separate sections", aliases: ["divider", "hr", "line"] },
  { id: "image", label: "Image", description: "Insert an image file", aliases: ["image", "img", "picture"] },
  { id: "table", label: "Table", description: "Insert a simple table", aliases: ["table", "grid"] },
  { id: "toggle", label: "Toggle", description: "Collapsible section", aliases: ["toggle", "details", "accordion"] },
];

test("setiap item slash punya alias kanonis yang dijawab persis", () => {
  const canonical = {
    "h1": "h1",
    "h2": "h2",
    "h3": "h3",
    "bullet": "bullet",
    "number": "number",
    "todo": "todo",
    "quote": "quote",
    "code": "code",
    "divider": "divider",
    "image": "image",
    "table": "table",
    "toggle": "toggle",
    "callout": "callout",
    "page": "page",
  };
  for (const [query, expectedId] of Object.entries(canonical)) {
    assert.equal(
      ids(filterSlashItems(aliasFixture, query))[0],
      expectedId,
      `/\\${query} harus menyorot ${expectedId}`,
    );
  }
});

test("skor nama (label) di atas skor alias untuk kueri yang sama", () => {
  const duel = [
    { id: "label-holder", label: "Todo", description: "", aliases: [] },
    { id: "alias-holder", label: "Other", description: "", aliases: ["todo"] },
  ];
  assert.deepEqual(ids(filterSlashItems(duel, "todo")), ["label-holder", "alias-holder"]);
});
