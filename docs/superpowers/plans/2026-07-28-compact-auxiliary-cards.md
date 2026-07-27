# Compact Auxiliary Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make compact-view meeting and office cards use the same short horizontal arrangement as power cards while leaving the control center and list view unchanged.

**Architecture:** Add one internal presentation predicate that selects horizontal compact cards for `power`, `meeting`, and `hire`. Reuse the existing horizontal card and operator-row classes in `CompactRoomCard`, and top-align the auxiliary container so the two short cards are not stretched by the taller control-center grid row.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Node test runner.

---

### Task 1: Define the horizontal compact-room policy

**Files:**
- Modify: `src/schedule-view-presentation.test.ts:47-56`
- Modify: `src/schedule-view-presentation.ts:57-59`

- [ ] **Step 1: Write the failing presentation-policy test**

Add this test after the existing power-card class test:

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

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
```

Expected: FAIL because `presentation.usesCompactHorizontalCard` is undefined.

- [ ] **Step 3: Add the minimal presentation predicate**

Append to `src/schedule-view-presentation.ts`:

```ts
const COMPACT_HORIZONTAL_GROUPS = new Set(["power", "meeting", "hire"]);

export function usesCompactHorizontalCard(group: string) {
  return COMPACT_HORIZONTAL_GROUPS.has(group);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
```

Expected: all presentation tests pass.

- [ ] **Step 5: Commit the policy**

```powershell
git add -- src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "test: define compact horizontal room policy"
```

### Task 2: Reuse the horizontal card for meeting and office

**Files:**
- Modify: `src/components/CompactScheduleView.tsx:12-25`
- Modify: `src/components/CompactScheduleView.tsx:68-144`
- Modify: `src/components/CompactScheduleView.tsx:212-217`
- Test: `src/schedule-view-presentation.test.ts`

- [ ] **Step 1: Import and apply the horizontal policy**

Add `usesCompactHorizontalCard` to the presentation imports, then derive both flags:

```ts
const isPower = row.group === "power";
const isHorizontal = usesCompactHorizontalCard(row.group);
```

Change the horizontal return branch from:

```ts
if (isPower) {
```

to:

```ts
if (isHorizontal) {
```

Keep the existing power-only efficiency rendering unchanged. Meeting and office continue to receive their existing slot counts from `roomSlotCountFor`.

- [ ] **Step 2: Preserve 8px spacing for the two meeting slots**

Change the horizontal operator-row class in `src/schedule-view-presentation.ts` to:

```ts
export const COMPACT_POWER_OPERATOR_ROW_CLASS =
  "flex items-start justify-end gap-2";
```

Update the existing class assertion in `src/schedule-view-presentation.test.ts` to expect the same value.

- [ ] **Step 3: Stop the auxiliary cards from stretching**

Change the row-one auxiliary wrapper to:

```tsx
<div className="flex items-start justify-between gap-3">
  {meeting && makeCard(meeting, COMPACT_AUXILIARY_WIDTHS.meeting)}
  {office && makeCard(office, COMPACT_AUXILIARY_WIDTHS.hire)}
</div>
```

The control-center card remains on the left with its existing vertical layout.

- [ ] **Step 4: Run focused and full automated checks**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
npm test
npm run lint
npm run build
```

Expected: presentation tests and all repository tests pass; lint and production build exit with code 0.

- [ ] **Step 5: Commit the component change**

```powershell
git add -- src/components/CompactScheduleView.tsx src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "fix: compact meeting and office cards"
```

### Task 3: Browser geometry and regression verification

**Files:**
- Verify: `src/components/CompactScheduleView.tsx`
- Verify: `src/schedule-view-presentation.ts`
- Verify: `src/schedule-view-presentation.test.ts`

- [ ] **Step 1: Start the local application**

Run:

```powershell
npm run dev
```

Expected: Next dev server is ready at `http://127.0.0.1:5174`.

- [ ] **Step 2: Load Full E2 and switch to compact view**

Use the browser to load the 243 Full E2 sample, generate a schedule if no persisted result is available, and select `一图流布局`.

- [ ] **Step 3: Verify compact geometry at 1280px**

With the sidebar expanded and then collapsed, verify:

- meeting and office card heights differ by at most 1px;
- both card heights are between 108px and 112px;
- meeting operator-frame gap is exactly 8px;
- title offsets remain 24px from the card left and 12px from the card top;
- no title, level, frame, or name is clipped or overlaps another element;
- the document has no horizontal overflow;
- the control-center layout and height are unchanged.

- [ ] **Step 4: Verify compact geometry at 1920px**

Repeat the height, offset, spacing, clipping, and overflow checks at 1920px. Expected operator frames are 76px.

- [ ] **Step 5: Verify list-view regression**

Switch to `列表式布局` at 1280px and verify:

- functional facilities remain a 3+2 layout;
- list operator frames remain 88px;
- processing remains present and collapsed by default.

- [ ] **Step 6: Stop the dev server and inspect the final diff**

Run:

```powershell
git diff --check
git status --short --branch
git diff origin/main...HEAD --stat
```

Expected: no whitespace errors; only the design/plan documents, compact component, presentation helper, and presentation tests differ from `origin/main`.
