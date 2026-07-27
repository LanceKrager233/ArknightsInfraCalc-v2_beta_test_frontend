# Compact Auxiliary Cards and Dormitory Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make compact-view meeting and office cards use the same short horizontal arrangement as power cards, then move all dormitories into an independent right-hand stack so they immediately fill the space below those short cards.

**Architecture:** Keep compact room grouping and card content unchanged, but replace the outer shared-row grid with two independent `55% / 45%` vertical flex stacks. The left stack renders the control center, workstation pairs, and power rooms; the right stack renders the `65% / 35%` meeting/office row followed by dormitories 1–4. Reuse the horizontal-card predicate and styles for `power`, `meeting`, and `hire`; the list view remains untouched.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Node test runner.

---

### Task 1: Define the horizontal compact-room policy

**Files:**
- Modify: `src/schedule-view-presentation.test.ts`
- Modify: `src/schedule-view-presentation.ts`

- [x] **Step 1: Write the failing presentation-policy test**

```ts
test("uses horizontal compact cards only for power and auxiliary rooms", () => {
  assert.equal(typeof presentation.usesCompactHorizontalCard, "function");
  assert.equal(presentation.usesCompactHorizontalCard("power"), true);
  assert.equal(presentation.usesCompactHorizontalCard("meeting"), true);
  assert.equal(presentation.usesCompactHorizontalCard("hire"), true);
  assert.equal(presentation.usesCompactHorizontalCard("control"), false);
  assert.equal(presentation.usesCompactHorizontalCard("trading"), false);
  assert.equal(presentation.usesCompactHorizontalCard("manufacture"), false);
  assert.equal(presentation.usesCompactHorizontalCard("dormitory"), false);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
```

Expected: FAIL because `presentation.usesCompactHorizontalCard` is undefined.

- [x] **Step 3: Add the minimal presentation predicate**

```ts
const COMPACT_HORIZONTAL_GROUPS = new Set(["power", "meeting", "hire"]);

export function usesCompactHorizontalCard(group: string) {
  return COMPACT_HORIZONTAL_GROUPS.has(group);
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: all presentation tests pass.

- [x] **Step 5: Commit the policy**

```powershell
git add -- src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "test: define compact horizontal room policy"
```

Completed in commit `2ae3c85`.

### Task 2: Reuse the horizontal card for meeting and office

**Files:**
- Modify: `src/components/CompactScheduleView.tsx`
- Modify: `src/schedule-view-presentation.ts`
- Test: `src/schedule-view-presentation.test.ts`

- [x] **Step 1: Import and apply the horizontal policy**

Add `usesCompactHorizontalCard` to the presentation imports, derive:

```ts
const isPower = row.group === "power";
const isHorizontal = usesCompactHorizontalCard(row.group);
```

Use `if (isHorizontal)` for the horizontal return branch while keeping efficiency rendering guarded by `isPower`.

- [x] **Step 2: Preserve 8px spacing for the two meeting slots**

```ts
export const COMPACT_POWER_OPERATOR_ROW_CLASS =
  "flex items-start justify-end gap-2";
```

- [x] **Step 3: Stop the auxiliary cards from stretching**

```tsx
<div className="flex items-start justify-between gap-3">
  {meeting && makeCard(meeting, COMPACT_AUXILIARY_WIDTHS.meeting)}
  {office && makeCard(office, COMPACT_AUXILIARY_WIDTHS.hire)}
</div>
```

- [x] **Step 4: Run focused and full automated checks**

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
npm test
npm run lint
npm run build
```

Expected: focused tests, all repository tests, lint, and production build pass.

- [x] **Step 5: Commit the component change**

```powershell
git add -- src/components/CompactScheduleView.tsx src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "fix: compact meeting and office cards"
```

Completed in commit `fe704e9`.

### Task 3: Split the compact schedule into independent vertical stacks

**Files:**
- Modify: `src/schedule-view-presentation.test.ts`
- Modify: `src/schedule-view-presentation.ts`
- Modify: `src/components/CompactScheduleView.tsx`

- [ ] **Step 1: Write the failing two-column presentation test**

Replace the compact-grid test with:

```ts
test("widens the compact two-column stack and removes processing from that view", () => {
  assert.equal(
    presentation.COMPACT_GRID_CLASS,
    "-mx-[72px] flex items-start gap-3",
  );
  assert.equal(
    presentation.COMPACT_COLUMN_CLASS,
    "flex min-w-0 flex-col gap-3",
  );
  assert.equal(typeof presentation.isCompactScheduleGroupVisible, "function");
  assert.equal(presentation.isCompactScheduleGroupVisible("processing"), false);
  assert.equal(presentation.isCompactScheduleGroupVisible("power"), true);
  assert.equal(presentation.isCompactScheduleGroupVisible("dormitory"), true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
```

Expected: FAIL because `COMPACT_GRID_CLASS` still uses `grid` and `COMPACT_COLUMN_CLASS` is undefined.

- [ ] **Step 3: Add the compact stack presentation constants**

Replace the old grid constant in `src/schedule-view-presentation.ts` with:

```ts
export const COMPACT_GRID_CLASS = "-mx-[72px] flex items-start gap-3";

export const COMPACT_COLUMN_CLASS = "flex min-w-0 flex-col gap-3";
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: all presentation tests pass.

- [ ] **Step 5: Render the left and right stacks independently**

Remove the unused `Fragment` import, import `COMPACT_COLUMN_CLASS`, and replace the shared-row return block in `CompactScheduleView` with:

```tsx
return (
  <div className={COMPACT_GRID_CLASS}>
    <div
      className={COMPACT_COLUMN_CLASS}
      style={{ flexBasis: `${GRID_LEFT_PCT}%` }}
    >
      <div>{ctrl ? makeCard(ctrl) : null}</div>

      {[0, 2, 4].map((start) => (
        <div key={start} className="flex justify-between gap-3">
          {workstations[start] && makeCard(workstations[start], 50)}
          {workstations[start + 1] && makeCard(workstations[start + 1], 50)}
        </div>
      ))}

      {powerCount === 3 ? (
        <div className="flex items-start justify-between gap-3">
          {power.slice(0, 3).map((room) => makeCard(room, 33))}
        </div>
      ) : (
        <div className="flex justify-between gap-3">
          <div className="flex justify-between gap-3" style={{ flexBasis: "50%" }}>
            {power[0] && makeCard(power[0])}
            {power[1] && makeCard(power[1])}
          </div>
          {workstations[6] && makeCard(workstations[6], 50)}
        </div>
      )}
    </div>

    <div
      className={COMPACT_COLUMN_CLASS}
      style={{ flexBasis: `${GRID_RIGHT_PCT}%` }}
    >
      <div className="flex items-start justify-between gap-3">
        {meeting && makeCard(meeting, COMPACT_AUXILIARY_WIDTHS.meeting)}
        {office && makeCard(office, COMPACT_AUXILIARY_WIDTHS.hire)}
      </div>
      {dorms.slice(0, 4).map((dorm) => (
        <div key={dorm.key}>{makeCard(dorm)}</div>
      ))}
    </div>
  </div>
);
```

The fallback still allows two power rooms and a seventh workstation in the left stack. Dormitory 1 now begins exactly one `gap-3` below the auxiliary row.

- [ ] **Step 6: Run all automated checks**

```powershell
npm test
npm run lint
npm run build
```

Expected: all repository tests pass; lint and production build exit with code 0.

- [ ] **Step 7: Commit the independent-stack layout**

```powershell
git add -- src/components/CompactScheduleView.tsx src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "fix: fill compact auxiliary column with dormitories"
```

### Task 4: Browser geometry and regression verification

**Files:**
- Verify: `src/components/CompactScheduleView.tsx`
- Verify: `src/schedule-view-presentation.ts`
- Verify: `src/schedule-view-presentation.test.ts`

- [ ] **Step 1: Start the local application**

```powershell
npm run dev
```

Expected: Next dev server is ready at `http://127.0.0.1:5174`.

- [ ] **Step 2: Load Full E2 and switch to compact view**

Load the 243 Full E2 sample, generate a schedule, and select the compact one-image layout.

- [ ] **Step 3: Verify compact geometry at 1280px**

With the sidebar expanded and then collapsed, measure:

- meeting and office card heights differ by at most 1px and are between 108px and 112px;
- meeting operator-frame gap is exactly 8px;
- dormitory 1 begins 12px below the auxiliary row and dormitories 2–4 each have a 12px vertical gap;
- control center, workstation pairs, and power row retain their order in the independent left stack;
- no title, operator frame, or name overlaps another element;
- the document has no horizontal overflow.

- [ ] **Step 4: Verify compact geometry at 1920px**

Repeat the height, spacing, clipping, stack-order, and overflow checks. Expected compact operator frames are 76px.

- [ ] **Step 5: Verify list-view regression**

Switch to the list layout at 1280px and verify:

- functional facilities remain a 3+2 layout;
- list operator frames remain 88px;
- processing remains present and collapsed by default.

- [ ] **Step 6: Stop the dev server and inspect the final diff**

```powershell
git diff --check
git status --short --branch
git diff origin/main...HEAD --stat
```

Expected: no whitespace errors; only the design/plan documents, compact component, presentation helper, and presentation tests differ from `origin/main`.

### Task 5: Create, review, merge, and deploy the PR

**Files:**
- Review: every file in `git diff origin/main...HEAD`
- Deploy artifact: `deploy-main.tar` generated from merged `main`

- [ ] **Step 1: Push the feature branch and create a ready PR**

```powershell
git push -u fork codex/compact-auxiliary-cards
gh pr create --repo KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend --base main --head yeyouchuan:codex/compact-auxiliary-cards --title "优化一图流辅助设施与宿舍排布" --body "仅调整一图流：会客室和办公室改为约 110px 的横排等高卡片，宿舍改为右侧独立纵向堆叠并上移填空；控制中枢、列表式、CLI、存储、反馈 JSON 与 MAA JSON 不变。验证：npm test、npm run lint、npm run build，以及 1280/1920px Full E2 浏览器几何回归。"
```

Expected: push succeeds and `gh pr create` returns a non-Draft PR URL.

- [ ] **Step 2: Review the PR and merge normally**

```powershell
gh pr view --repo KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend --json number,url,isDraft,mergeable,statusCheckRollup,files
gh pr diff --repo KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend
gh pr merge --repo KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend --merge
```

Expected: the PR is ready, mergeable, limited to intended compact-layout files and documentation, and merged with a normal merge commit.

- [ ] **Step 3: Pull merged main and build the deploy artifact**

In the primary worktree:

```powershell
git fetch origin main
git switch main
git pull --ff-only origin main
npm ci
npm run lint
npm run build
git archive --format=tar --output=deploy-main.tar HEAD
```

Expected: local `main` points to the merged upstream commit; user-owned `.gitignore` and `design-qa.md` remain intact; validation passes; the archive contains tracked files only.

- [ ] **Step 4: Upload and release without replacing persisted data**

Upload:

```powershell
scp deploy-main.tar root@110.42.36.46:/root/deploy-main.tar
```

Run the release script:

```powershell
@'
set -e
cd /root
ts=$(date +%Y%m%d%H%M%S)
app=/root/ArknightsInfraCalc-v2_beta_test_frontend-main
release=${app}.deploy-$ts
backup=${app}.backup-$ts
cp -a "$app" "$backup"
mkdir -p "$release"
tar -xf /root/deploy-main.tar -C "$release"
rsync -a --delete \
  --exclude='.env.local' \
  --exclude='server/storage/' \
  --exclude='bin/data/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  "$release"/ "$app"/
cd "$app"
npm ci
npm run build
chmod +x bin/infra-cli
old_pid=$(ss -ltnp 'sport = :4174' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -1)
if [ -n "$old_pid" ]; then
  children=$(pgrep -P "$old_pid" || true)
  [ -n "$children" ] && kill $children || true
  kill "$old_pid" || true
  sleep 2
  kill -0 "$old_pid" 2>/dev/null && kill -9 "$old_pid" || true
fi
nohup ./node_modules/.bin/next start -H 0.0.0.0 -p 4174 > server/next.log 2>&1 &
'@ | ssh root@110.42.36.46
```

Expected: the timestamped backup remains available for rollback; `.env.local`, `server/storage`, and `bin/data` are preserved; the build succeeds; Next restarts on 4174.

- [ ] **Step 5: Verify the deployed application**

```powershell
ssh root@110.42.36.46 "ss -ltnp | grep ':4174'; curl -fsS http://127.0.0.1:4174/api/health; tail -n 80 /root/ArknightsInfraCalc-v2_beta_test_frontend-main/server/next.log"
```

Open the public 4174 page, load Full E2, generate a schedule, verify both layouts, and save one feedback item.

Expected: `/api/health` reports `ok: true` and `cliReady: true`; compact geometry matches Task 4; list layout remains unchanged; new files appear in `server/storage/cli-runs` and `server/storage/feedback`.
