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
