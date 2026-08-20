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

test("CI enforces route and document preload JavaScript budgets after building", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");
  const budgetCheck = await readRepoFile("scripts/check-bundle-budget.mjs");

  assert.equal(packageJson.scripts["test:bundle-budget"], "node scripts/check-bundle-budget.mjs");
  assert.match(workflow, /Production build[\s\S]+npm run test:bundle-budget/);
  assert.match(budgetCheck, /MAX_ROUTE_INITIAL_JS_BYTES = 1_130_000/);
  assert.match(budgetCheck, /MAX_SECONDARY_ROUTE_INITIAL_JS_BYTES = 1_525_000/);
  assert.match(budgetCheck, /MAX_DOCUMENT_INITIAL_JS_BYTES = 1_240_000/);
  assert.match(budgetCheck, /MAX_DOCUMENT_INITIAL_GZIP_JS_BYTES = 395_000/);
  assert.match(budgetCheck, /MAX_DOCUMENT_INITIAL_JS_FILES = 18/);
  assert.match(budgetCheck, /WORKBENCH_ROUTES = \["\/", "\/training", "\/skills", "\/skland", "\/account"\]/);
  assert.match(budgetCheck, /firstLoadUncompressedJsBytes/);
  assert.match(budgetCheck, /\.next\/server\/app\/index\.html/);
  assert.match(budgetCheck, /gzipSync/);
});

test("Next and the verified deployment keep real public GET responses compressed", async () => {
  const nextConfig = await readRepoFile("next.config.ts");
  const deployWorkflow = await readRepoFile(".github/workflows/deploy.yml");

  assert.match(nextConfig, /compress: true/);
  assert.match(deployWorkflow, /Deploy and verify[\s\S]+Verify public response compression/);
  assert.match(deployWorkflow, /node scripts\/verify-public-compression\.mjs "\$DEPLOY_PUBLIC_HEALTH_URL"/);
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
  const sklandPage = await readRepoFile("src/app/(workbench)/skland/page.tsx");
  const developmentSklandCenter = await readRepoFile("src/components/pages/DevelopmentSklandStatusCenter.tsx");
  const setupDialog = await readRepoFile("src/setup-dialog.tsx");
  const workflow = await readRepoFile(".github/workflows/frontend-quality.yml");

  assert.match(nextConfig, /APP_CLIENT_SKLAND_ENABLED: isSklandFeatureEnabled\(\) \? "1" : "0"/);
  assert.match(nextConfig, /APP_CLIENT_SKLAND_API_PREFIX: isSklandFeatureEnabled\(\) \? "\/api\/skland" : ""/);
  assert.match(nextConfig, /"workbench-skland-route": isSklandFeatureEnabled\(\)/);
  assert.match(nextConfig, /SklandRoute\.disabled\.tsx/);
  assert.match(app, /process\.env\.APP_CLIENT_SKLAND_ENABLED === "1"/);
  assert.match(sklandPage, /process\.env\.APP_CLIENT_SKLAND_ENABLED !== "1"/);
  assert.match(setupDialog, /process\.env\.APP_CLIENT_SKLAND_ENABLED === "1"/);
  assert.match(developmentSklandCenter, /SklandStatus/);
  assert.match(workflow, /Production build[\s\S]+APP_DEPLOYMENT_ENV: production/);
});

test("workbench views use five independent route entries under one persistent layout", async () => {
  const layout = await readRepoFile("src/app/(workbench)/layout.tsx");
  const app = await readRepoFile("src/App.tsx");
  const sidebar = await readRepoFile("src/components/layout/AppSidebar.tsx");
  const routeMap = await readRepoFile("src/workbench-routes.ts");
  const pages = await Promise.all([
    "src/app/(workbench)/page.tsx",
    "src/app/(workbench)/training/page.tsx",
    "src/app/(workbench)/skills/page.tsx",
    "src/app/(workbench)/skland/page.tsx",
    "src/app/(workbench)/account/page.tsx",
  ].map(readRepoFile));

  assert.match(layout, /import WorkbenchApp from "@\/App"/);
  assert.match(layout, /<WorkbenchApp>\{children\}<\/WorkbenchApp>/);
  assert.ok(pages.every((page) => !page.includes("dynamic(")));
  assert.doesNotMatch(app, /components\/pages\/(?:InfraCalculator|TrainingAdvice|SkillQuery|AccountStatusCenter|DevelopmentSklandStatusCenter)/);
  assert.match(routeMap, /training: "\/training"/);
  assert.match(routeMap, /"skill-query": "\/skills"/);
  assert.match(routeMap, /skland: "\/skland"/);
  assert.match(routeMap, /account: "\/account"/);
  assert.match(sidebar, /import Link from "next\/link"/);
  assert.match(sidebar, /prefetch=\{prefetchOnIntent \? null : false\}/);
  assert.match(sidebar, /onMouseEnter=\{\(\) => setPrefetchOnIntent\(true\)\}/);
});

test("the critical calculator board stays in the initial client graph", async () => {
  const calculator = await readRepoFile("src/components/pages/InfraCalculator.tsx");
  const calculatorRoute = await readRepoFile("src/components/workbench/CalculatorRoute.tsx");
  const app = await readRepoFile("src/App.tsx");

  assert.match(calculator, /import \{ ScheduleBoard, ShiftTabs \} from "@\/components"/);
  assert.doesNotMatch(calculator, /const (?:ScheduleBoard|ShiftTabs) = lazy\(/);
  assert.doesNotMatch(calculator, /const (?:ScheduleBoard|ShiftTabs) = dynamic\(/);
  assert.doesNotMatch(calculator, /<Suspense fallback=\{<DeferredResultLoading \/>\}><ScheduleBoard/);
  assert.match(calculatorRoute, /import \{ InfraCalculator \} from "@\/components\/pages\/InfraCalculator"/);
  assert.doesNotMatch(app, /PageScrollbar/);
  const components = await readRepoFile("src/components.tsx");
  assert.match(components, /useState<"list" \| "compact">\("compact"\)/);
  assert.match(components, /useState\(true\);[\s\S]{0,200}preferredViewMode/);
  assert.match(calculator, /useState<"list" \| "compact">\("compact"\)/);
  assert.doesNotMatch(components, /useState<"list" \| "compact">\(\(\) =>[\s\S]{0,200}matchMedia/);
  assert.match(app, /const hasRenderedCalculator = useRef\(false\)/);
  assert.match(calculator, /animateInitialView=\{!scheduleResult && animateEmptyScheduleEntrance\}/);
  assert.doesNotMatch(calculator, /animateInitialView=\{!scheduleResult\}/);
});

test("heavy account, operator, and scrollbar modules stay behind runtime boundaries", async () => {
  const app = await readRepoFile("src/App.tsx");
  const schedule = await readRepoFile("src/schedule.ts");
  const components = await readRepoFile("src/components.tsx");
  const scrollbar = await readRepoFile("src/components/ui/page-scrollbar.tsx");

  assert.match(app, /useWebsiteSessionIdentity/);
  assert.doesNotMatch(app, /authClient\.useSession/);
  assert.doesNotMatch(schedule, /operatorPresentationFor/);
  assert.doesNotMatch(components, /from "@\/operatorPortraits"/);
  assert.match(scrollbar, /import\("overlayscrollbars"\)/);
});

test("versioned product assets receive immutable cache headers", async () => {
  const nextConfig = await readRepoFile("next.config.ts");

  assert.match(nextConfig, /source: "\/images\/products\/:asset"/);
  assert.match(nextConfig, /key: "v", value: "\\\\d\+-\[0-9a-f\]\{12\}"/);
  assert.match(nextConfig, /public, max-age=31536000, immutable/);
});
