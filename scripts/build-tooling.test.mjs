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

test("CI enforces the initial route JavaScript budget after building", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");
  const budgetCheck = await readRepoFile("scripts/check-bundle-budget.mjs");

  assert.equal(packageJson.scripts["test:bundle-budget"], "node scripts/check-bundle-budget.mjs");
  assert.match(workflow, /Production build[\s\S]+npm run test:bundle-budget/);
  assert.match(budgetCheck, /MAX_INITIAL_JS_BYTES = 1_100_000/);
  assert.match(budgetCheck, /firstLoadUncompressedJsBytes/);
});

test("CI gates releases on Chromium and schedules the full WebKit suite", async () => {
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");

  assert.match(workflow, /browser_e2e:[\s\S]+npm run test:e2e[\s\S]+npm run test:e2e:production-profile/);
  assert.match(workflow, /webkit_e2e:[\s\S]+github\.event_name == 'schedule'[\s\S]+npm run test:e2e:webkit/);
  assert.match(workflow, /quality:[\s\S]+needs: \[checks, browser_e2e\]/);
  assert.doesNotMatch(workflow, /quality:[\s\S]+needs: \[[^\]]*webkit_e2e/);
  assert.match(workflow, /deploy:[\s\S]+needs: quality/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
});

test("CI browser jobs use the matching pinned Playwright image without runtime apt installs", async () => {
  const packageLock = JSON.parse(await readRepoFile("package-lock.json"));
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");
  const playwrightVersion = packageLock.packages["node_modules/@playwright/test"].version;
  const escapedVersion = playwrightVersion.replaceAll(".", "\\.");
  const pinnedImage = new RegExp(`image: mcr\\.microsoft\\.com/playwright:v${escapedVersion}-noble@sha256:[a-f0-9]{64}`, "g");
  const browserJobs = workflow.slice(workflow.indexOf("  browser_e2e:"), workflow.indexOf("  quality:"));

  assert.equal(workflow.match(pinnedImage)?.length, 2);
  assert.equal(browserJobs.match(/@postgres:5432\/arknights_auth_test/g)?.length, 6);
  assert.doesNotMatch(browserJobs, /playwright install(?:-deps)?/);
  assert.doesNotMatch(browserJobs, /Initialize limited database roles/);
  assert.equal(browserJobs.match(/options: --user 1001/g)?.length, 2);
});

test("production injects the client feature flag at every browser boundary", async () => {
  const nextConfig = await readRepoFile("next.config.ts");
  const app = await readRepoFile("src/App.tsx");
  const developmentSklandCenter = await readRepoFile("src/components/pages/DevelopmentSklandStatusCenter.tsx");
  const setupDialog = await readRepoFile("src/setup-dialog.tsx");
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");

  assert.match(nextConfig, /APP_CLIENT_SKLAND_ENABLED: isSklandFeatureEnabled\(\) \? "1" : "0"/);
  assert.match(app, /process\.env\.APP_CLIENT_SKLAND_ENABLED === "1"/);
  assert.match(setupDialog, /process\.env\.APP_CLIENT_SKLAND_ENABLED === "1"/);
  assert.match(developmentSklandCenter, /SklandStatus/);
  assert.match(workflow, /Production build[\s\S]+APP_DEPLOYMENT_ENV: production/);
});

test("the application entry is split behind an accessible loading boundary", async () => {
  const page = await readRepoFile("src/app/page.tsx");
  const loader = await readRepoFile("src/AppLoader.tsx");

  assert.match(page, /import AppLoader from "@\/AppLoader"/);
  assert.match(loader, /dynamic\(\(\) => import\("@\/App"\)/);
  assert.match(loader, /ssr: false/);
  assert.match(loader, /role="status"/);
});
