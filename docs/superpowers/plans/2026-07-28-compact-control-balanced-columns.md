# Compact Control Balanced Columns Implementation Plan

> **Archived:** This is a historical UI implementation record. Any release instructions in adjacent dated plans are obsolete; use [`../../DEVELOPMENT_RELEASE_GUARDRAILS.md`](../../DEVELOPMENT_RELEASE_GUARDRAILS.md) and the repository `AGENTS.md` for current deployment and rollback rules.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the compact-view control center to the horizontal 110px card geometry, make the two compact columns end at the same vertical position, and reuse list-view facility backgrounds on every compact card.

**Architecture:** Keep all reusable presentation policy in `src/schedule-view-presentation.ts`, then consume those constants from `CompactScheduleView`. The compact outer flex row stretches both columns; four equal flex-growing dorm wrappers absorb the remaining right-column height. Facility backgrounds reuse `roomVisualFor(group).background` with the existing list-view positioning, opacity, and gradient.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Node test runner.

---

### Task 1: Define compact control, column, dorm, and background policy

**Files:**
- Modify: `src/schedule-view-presentation.test.ts`
- Modify: `src/schedule-view-presentation.ts`

- [x] **Step 1: Write the failing presentation tests**

Add these assertions to `src/schedule-view-presentation.test.ts`:

```ts
test("stretches compact columns and lets dormitories share remaining height", () => {
  assert.equal(
    presentation.COMPACT_GRID_CLASS,
    "-mx-[80px] flex items-stretch gap-3",
  );
  assert.equal(
    presentation.COMPACT_DORM_WRAPPER_CLASS,
    "flex min-h-0 flex-1",
  );
  assert.equal(
    presentation.COMPACT_DORM_OPERATOR_AREA_CLASS,
    "flex min-h-0 flex-1 items-center",
  );
});

test("reuses list room backgrounds in every compact card", () => {
  assert.equal(
    presentation.COMPACT_ROOM_BACKGROUND_CLASS,
    "pointer-events-none absolute inset-0 bg-no-repeat opacity-[0.52]",
  );
  assert.equal(
    presentation.COMPACT_ROOM_GRADIENT_CLASS,
    "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#313131]/20 via-[#313131]/72 to-[#313131]",
  );
  assert.deepEqual(presentation.COMPACT_ROOM_BACKGROUND_STYLE, {
    backgroundPosition: "-18px center",
    backgroundSize: "auto 176px",
  });
});
```

Change the horizontal-card policy assertions to:

```ts
assert.equal(presentation.usesCompactHorizontalCard("control"), true);
assert.equal(presentation.usesCompactHorizontalCard("power"), true);
assert.equal(presentation.usesCompactHorizontalCard("meeting"), true);
assert.equal(presentation.usesCompactHorizontalCard("hire"), true);
```

Add a control-header assertion:

```ts
test("stacks the compact control level below its title", () => {
  assert.equal(
    presentation.COMPACT_CONTROL_HEADER_CLASS,
    "grid min-w-0 grid-cols-[4px_minmax(0,1fr)] grid-rows-[20px_16px] gap-x-2",
  );
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
```

Expected: FAIL because the dorm/background/control constants are undefined, the grid still uses `items-start`, and `control` is not a horizontal group.

- [x] **Step 3: Add the minimal presentation policy**

Update `src/schedule-view-presentation.ts`:

```ts
import type { CSSProperties } from "react";

export const COMPACT_GRID_CLASS = "-mx-[80px] flex items-stretch gap-3";
export const COMPACT_DORM_WRAPPER_CLASS = "flex min-h-0 flex-1";
export const COMPACT_DORM_OPERATOR_AREA_CLASS =
  "flex min-h-0 flex-1 items-center";

export const COMPACT_CONTROL_HEADER_CLASS =
  "grid min-w-0 grid-cols-[4px_minmax(0,1fr)] grid-rows-[20px_16px] gap-x-2";

export const COMPACT_ROOM_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-0 bg-no-repeat opacity-[0.52]";

export const COMPACT_ROOM_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#313131]/20 via-[#313131]/72 to-[#313131]";

export const COMPACT_ROOM_BACKGROUND_STYLE = {
  backgroundPosition: "-18px center",
  backgroundSize: "auto 176px",
} satisfies CSSProperties;

const COMPACT_HORIZONTAL_GROUPS = new Set([
  "control",
  "power",
  "meeting",
  "hire",
]);
```

Ensure both compact card classes contain `relative overflow-hidden`:

```ts
export const COMPACT_CARD_CLASS =
  "relative flex flex-col justify-start gap-2 overflow-hidden bg-[#313131] px-3 py-2";

export const COMPACT_POWER_CARD_CLASS =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 overflow-hidden bg-[#313131] px-3 py-2";
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2.

Expected: all presentation tests pass.

- [x] **Step 5: Commit the presentation policy**

```powershell
git add -- src/schedule-view-presentation.ts src/schedule-view-presentation.test.ts
git commit -m "test: define balanced compact room presentation"
```

### Task 2: Render compact backgrounds and the horizontal control center

**Files:**
- Modify: `src/components/CompactScheduleView.tsx`

- [x] **Step 1: Import the new presentation constants**

Add:

```ts
import {
  COMPACT_CONTROL_HEADER_CLASS,
  COMPACT_DORM_OPERATOR_AREA_CLASS,
  COMPACT_DORM_WRAPPER_CLASS,
  COMPACT_ROOM_BACKGROUND_CLASS,
  COMPACT_ROOM_BACKGROUND_STYLE,
  COMPACT_ROOM_GRADIENT_CLASS,
} from "@/schedule-view-presentation";
```

- [x] **Step 2: Add the shared facility background layers**

Inside `CompactRoomCard`, create:

```tsx
const backgroundLayers = (
  <>
    <div
      className={COMPACT_ROOM_BACKGROUND_CLASS}
      style={{
        ...COMPACT_ROOM_BACKGROUND_STYLE,
        backgroundImage: `url(${visual.background})`,
      }}
      aria-hidden="true"
    />
    <div className={COMPACT_ROOM_GRADIENT_CLASS} aria-hidden="true" />
  </>
);
```

Render `backgroundLayers` as the first children of both card variants. Give the horizontal left-content block and operator row `relative z-10`; give the vertical header, efficiency block, and operator area the same foreground stacking.

- [x] **Step 3: Add the control-specific stacked header**

Set:

```ts
const isControl = row.group === "control";
```

Select the horizontal operator-row class with:

```ts
const horizontalOperatorRowClass =
  isPower || isControl
    ? COMPACT_POWER_OPERATOR_ROW_CLASS
    : COMPACT_AUXILIARY_OPERATOR_ROW_CLASS;
```

This keeps the control center flush with the normal right padding instead of applying the narrow auxiliary-card nudge.

For control only, replace the shared one-line header with:

```tsx
<div className={COMPACT_CONTROL_HEADER_CLASS}>
  <span
    className="row-span-2 h-5 w-1 self-start bg-[var(--room-accent)]"
    aria-hidden="true"
  />
  <span className={COMPACT_ROOM_TITLE_CLASS}>{row.title}</span>
  {row.level ? (
    <span className={COMPACT_ROOM_LEVEL_CLASS}>
      Lv.{row.level}/{layoutRoom ? maxRoomLevel(layoutRoom.kind) : row.level}
    </span>
  ) : null}
</div>
```

Keep all other room headers on `COMPACT_HEADER_CLASS`.

- [x] **Step 4: Center expanded dorm content below the fixed header**

For the vertical card variant, wrap the operator row:

```tsx
<div
  className={
    row.group === "dormitory"
      ? COMPACT_DORM_OPERATOR_AREA_CLASS
      : undefined
  }
>
  <div className={COMPACT_OPERATOR_ROW_CLASS}>{operators}</div>
</div>
```

The title remains in its fixed header at the top; only the operator region shares the added vertical room.

- [x] **Step 5: Run focused tests and TypeScript lint**

Run:

```powershell
node --test --experimental-strip-types src/schedule-view-presentation.test.ts
npm run lint
```

Expected: tests pass and ESLint exits with code 0.

- [x] **Step 6: Commit the compact card rendering**

```powershell
git add -- src/components/CompactScheduleView.tsx
git commit -m "feat: compact the control center and add room backgrounds"
```

### Task 3: Make the four dormitories absorb the remaining column height

**Files:**
- Modify: `src/components/CompactScheduleView.tsx`

- [x] **Step 1: Apply equal flex growth to dormitory wrappers**

Replace:

```tsx
{dorms.slice(0, 4).map((dorm) => (
  <div key={dorm.key}>{makeCard(dorm)}</div>
))}
```

with:

```tsx
{dorms.slice(0, 4).map((dorm) => (
  <div key={dorm.key} className={COMPACT_DORM_WRAPPER_CLASS}>
    {makeCard(dorm)}
  </div>
))}
```

Because `makeCard(dorm)` already sets `flex: 1`, each card fills its equal wrapper.

- [x] **Step 2: Run all automated checks**

```powershell
npm test
npm run lint
npm run build
git diff --check
```

Expected: all repository tests pass; lint, build, and diff check exit with code 0.

- [x] **Step 3: Commit the balanced columns**

```powershell
git add -- src/components/CompactScheduleView.tsx
git commit -m "fix: balance compact schedule columns"
```

### Task 4: Browser geometry and regression verification

**Files:**
- Verify: `src/components/CompactScheduleView.tsx`
- Verify: `src/schedule-view-presentation.ts`
- Verify: `src/schedule-view-presentation.test.ts`

- [x] **Step 1: Start the local app and load Full E2**

Run:

```powershell
npm run dev
```

Load the 243 Full E2 fixture, generate a schedule, and switch to compact layout.

- [x] **Step 2: Measure compact geometry at 1280px**

With the sidebar expanded and collapsed, verify:

- control, meeting, and office heights differ by no more than `1px`;
- control title/level do not overlap the five operator frames;
- all four dormitory heights differ by no more than `1px`;
- every compact vertical gap remains `12px`;
- left and right visible card bottoms differ by no more than `1px`;
- document `scrollWidth` equals `clientWidth`.

- [x] **Step 3: Measure compact geometry at 1920px**

Repeat Step 2 and additionally verify compact operator frames are `76px`.

- [x] **Step 4: Verify facility backgrounds**

For control, trading, manufacture, power, meeting, hire, and dormitory cards, inspect the computed background layer:

- correct `roomVisualFor(group).background` URL;
- opacity `0.52`;
- position `-18px center`;
- size `auto 176px`;
- foreground title, efficiency, product, and operators remain readable.

- [x] **Step 5: Verify list-view regression**

At 1280px, switch to list view and verify:

- functional facilities remain 3+2;
- operator frames remain `88px`;
- processing is present and collapsed by default;
- list room backgrounds and card heights are unchanged;
- no console or page errors were introduced.

- [x] **Step 6: Stop the dev server and inspect scope**

```powershell
git status --short
git diff origin/main...HEAD --stat
git diff --check origin/main...HEAD
```

Expected: only the design/plan docs, compact presentation policy/tests, and compact component are included. Local `.gitignore`, `design-qa.md`, and `.superpowers/` remain uncommitted.

### Task 5: Final review

**Files:**
- Review: all files in `git diff origin/main...HEAD`

- [x] **Step 1: Review behavior and scope**

Confirm:

- compact-only visual behavior;
- no list-layout, API, efficiency, scheduling, storage, MAA, feedback, or `own:false` changes;
- no generated or local-only files staged.

- [x] **Step 2: Re-run final verification**

```powershell
npm test
npm run lint
npm run build
git diff --check origin/main...HEAD
```

Expected: every command exits with code 0.
