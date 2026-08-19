import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stdout } from "node:process";
import { URL } from "node:url";
import { gzipSync } from "node:zlib";

const MAX_ROUTE_INITIAL_JS_BYTES = 1_100_000;
const MAX_DOCUMENT_INITIAL_JS_BYTES = 1_450_000;
const MAX_DOCUMENT_INITIAL_GZIP_JS_BYTES = 410_000;
const MAX_DOCUMENT_INITIAL_JS_FILES = 20;
const statsUrl = new URL("../.next/diagnostics/route-bundle-stats.json", import.meta.url);
const documentUrl = new URL("../.next/server/app/index.html", import.meta.url);
const buildRootUrl = new URL("../.next/", import.meta.url);
const stats = JSON.parse(await readFile(statsUrl, "utf8"));

assert.ok(Array.isArray(stats), "route bundle stats must be an array; run npm run build first");
const rootRoute = stats.find((entry) => entry?.route === "/");
assert.ok(rootRoute, "route bundle stats do not contain the / route");
assert.ok(
  Number.isFinite(rootRoute.firstLoadUncompressedJsBytes),
  "/ firstLoadUncompressedJsBytes must be a finite number",
);
assert.ok(
  rootRoute.firstLoadUncompressedJsBytes <= MAX_ROUTE_INITIAL_JS_BYTES,
  `/ route initial uncompressed JavaScript is ${rootRoute.firstLoadUncompressedJsBytes} bytes, exceeding the ${MAX_ROUTE_INITIAL_JS_BYTES} byte budget`,
);

const document = await readFile(documentUrl, "utf8");
const initialScriptPaths = [...document.matchAll(/(?:src|href)="([^"]+\.js(?:\?[^"]*)?)"/g)]
  .map((match) => new URL(match[1], "https://bundle-budget.invalid").pathname)
  .filter((pathname) => pathname.startsWith("/_next/static/chunks/"));
const uniqueInitialScriptPaths = [...new Set(initialScriptPaths)];

assert.ok(uniqueInitialScriptPaths.length > 0, "/ document does not reference any initial JavaScript chunks");
assert.ok(
  uniqueInitialScriptPaths.length <= MAX_DOCUMENT_INITIAL_JS_FILES,
  `/ document references ${uniqueInitialScriptPaths.length} initial JavaScript files, exceeding the ${MAX_DOCUMENT_INITIAL_JS_FILES} file budget`,
);

const initialScriptBodies = await Promise.all(uniqueInitialScriptPaths.map(async (pathname) => {
  const relativePath = pathname.slice("/_next/".length);
  return readFile(new URL(relativePath, buildRootUrl));
}));
const documentInitialJsBytes = initialScriptBodies.reduce((total, body) => total + body.byteLength, 0);
const documentInitialGzipJsBytes = initialScriptBodies.reduce(
  (total, body) => total + gzipSync(body, { level: 9 }).byteLength,
  0,
);

assert.ok(
  documentInitialJsBytes <= MAX_DOCUMENT_INITIAL_JS_BYTES,
  `/ document initial uncompressed JavaScript is ${documentInitialJsBytes} bytes, exceeding the ${MAX_DOCUMENT_INITIAL_JS_BYTES} byte budget`,
);
assert.ok(
  documentInitialGzipJsBytes <= MAX_DOCUMENT_INITIAL_GZIP_JS_BYTES,
  `/ document initial gzip JavaScript is ${documentInitialGzipJsBytes} bytes, exceeding the ${MAX_DOCUMENT_INITIAL_GZIP_JS_BYTES} byte budget`,
);

stdout.write(
  [
    `/ route bundle budget passed: ${rootRoute.firstLoadUncompressedJsBytes} / ${MAX_ROUTE_INITIAL_JS_BYTES} uncompressed JS bytes`,
    `/ document preload budget passed: ${uniqueInitialScriptPaths.length} / ${MAX_DOCUMENT_INITIAL_JS_FILES} files, ${documentInitialJsBytes} / ${MAX_DOCUMENT_INITIAL_JS_BYTES} raw bytes, ${documentInitialGzipJsBytes} / ${MAX_DOCUMENT_INITIAL_GZIP_JS_BYTES} gzip bytes`,
    "",
  ].join("\n"),
);
