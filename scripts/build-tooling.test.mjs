import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const repoRoot = new URL("../", import.meta.url);

async function readRepoFile(relativePath) {
  return readFile(new URL(relativePath, repoRoot), "utf8");
}

test("Next.js commands use the default Turbopack bundler", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const playwrightConfig = await readRepoFile("playwright.config.ts");
  const productionPlaywrightConfig = await readRepoFile("playwright.production.config.ts");

  assert.equal(packageJson.scripts.build, "next build");
  assert.doesNotMatch(packageJson.scripts.dev, /--webpack\b/);
  assert.doesNotMatch(playwrightConfig, /--webpack\b/);
  assert.doesNotMatch(productionPlaywrightConfig, /--webpack\b/);
});
