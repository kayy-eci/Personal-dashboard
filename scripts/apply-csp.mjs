import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exportDirectory = join(root, "out");

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(path)));
    } else if (entry.isFile() && extname(entry.name) === ".html") {
      files.push(path);
    }
  }

  return files;
}

function hashesFor(html, expression) {
  return [...html.matchAll(expression)]
    .map((match) =>
      createHash("sha256").update(match[1]).digest("base64"),
    )
    .map((hash) => `'sha256-${hash}'`);
}

const htmlFiles = await findHtmlFiles(exportDirectory);
if (htmlFiles.length === 0) {
  throw new Error(`No exported HTML files found in ${exportDirectory}`);
}

for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  const scriptHashes = hashesFor(
    html,
    /<script\b(?![^>]*\s+src\s*=)[^>]*>([\s\S]*?)<\/script>/gi,
  );
  const styleHashes = hashesFor(html, /<style\b[^>]*>([\s\S]*?)<\/style>/gi);
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(scriptHashes)].join(" ")}`.trim(),
    `style-src 'self' ${[...new Set(styleHashes)].join(" ")}`.trim(),
    "img-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  const withoutPolicy = html.replace(
    /<meta http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    "",
  );

  if (!/<head\b[^>]*>/i.test(withoutPolicy)) {
    throw new Error(`Cannot add Content-Security-Policy to ${path}: no head element`);
  }

  await writeFile(
    path,
    withoutPolicy.replace(/<head\b[^>]*>/i, (head) => `${head}${meta}`),
  );
}
