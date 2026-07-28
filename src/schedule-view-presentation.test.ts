import assert from "node:assert/strict";
import test from "node:test";

import * as presentation from "./schedule-view-presentation.ts";
import {
  COMPACT_CARD_CLASS,
  COMPACT_HEADER_CLASS,
  COMPACT_OPERATOR_ROW_CLASS,
  COMPACT_OPERATOR_SIZE_CLASS,
  COMPACT_ROOM_LEVEL_CLASS,
  COMPACT_ROOM_TITLE_CLASS,
  OPERATOR_NAME_SIZE_CLASS,
  compactFactoryAccent,
  compactTradeAccent,
} from "./schedule-view-presentation.ts";

test("uses the smaller operator name size in both schedule views", () => {
  assert.equal(OPERATOR_NAME_SIZE_CLASS, "text-xs max-sm:text-[10px]");
});

test("keeps compact operators responsive, left aligned, and eight pixels apart", () => {
  assert.equal(
    COMPACT_OPERATOR_SIZE_CLASS,
    "[--operator-slot-size:clamp(64px,5.9vw,76px)]",
  );
  assert.equal(
    COMPACT_OPERATOR_ROW_CLASS,
    "flex items-start justify-start gap-2",
  );
});

test("widens the compact two-column stack and removes processing from that view", () => {
  assert.equal(
    presentation.COMPACT_GRID_CLASS,
    "-mx-[80px] flex items-stretch gap-3",
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

test("stretches compact columns and lets dormitories share remaining height", () => {
  assert.equal(
    presentation.COMPACT_DORM_WRAPPER_CLASS,
    "flex min-h-0 flex-1",
  );
  assert.equal(
    presentation.COMPACT_DORM_OPERATOR_AREA_CLASS,
    "flex min-h-0 flex-1 items-center",
  );
});

test("allocates the compact auxiliary row by operator capacity", () => {
  assert.deepEqual(presentation.COMPACT_AUXILIARY_WIDTHS, {
    meeting: 65,
    hire: 35,
  });
});

test("right-aligns operators in horizontal power and auxiliary cards", () => {
  assert.equal(
    presentation.COMPACT_POWER_CARD_CLASS,
    "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 overflow-hidden bg-[#313131] px-3 py-2",
  );
  assert.equal(
    presentation.COMPACT_POWER_OPERATOR_ROW_CLASS,
    "flex items-start justify-end gap-2",
  );
  assert.equal(
    presentation.COMPACT_AUXILIARY_OPERATOR_ROW_CLASS,
    "flex items-start justify-end gap-2 max-[1400px]:translate-x-1",
  );
});

test("uses horizontal compact cards for control, power, and auxiliary rooms", () => {
  assert.equal(typeof presentation.usesCompactHorizontalCard, "function");
  assert.equal(presentation.usesCompactHorizontalCard("power"), true);
  assert.equal(presentation.usesCompactHorizontalCard("meeting"), true);
  assert.equal(presentation.usesCompactHorizontalCard("hire"), true);
  assert.equal(presentation.usesCompactHorizontalCard("control"), true);
  assert.equal(presentation.usesCompactHorizontalCard("trading"), false);
  assert.equal(presentation.usesCompactHorizontalCard("manufacture"), false);
  assert.equal(presentation.usesCompactHorizontalCard("dormitory"), false);
});

test("stacks the compact control level below its title", () => {
  assert.equal(
    presentation.COMPACT_CONTROL_HEADER_CLASS,
    "grid min-w-0 grid-cols-[4px_minmax(0,1fr)] grid-rows-[20px_16px] gap-x-2",
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

test("pins every compact room title to the shared top position", () => {
  assert.equal(
    COMPACT_CARD_CLASS,
    "relative flex flex-col justify-start gap-2 overflow-hidden bg-[#313131] px-3 py-2",
  );
  assert.equal(
    COMPACT_HEADER_CLASS,
    "flex h-7 shrink-0 items-center gap-2",
  );
  assert.equal(
    COMPACT_ROOM_TITLE_CLASS,
    "shrink-0 whitespace-nowrap text-sm font-medium text-white",
  );
  assert.equal(
    COMPACT_ROOM_LEVEL_CLASS,
    "min-w-0 truncate text-xs text-white/50",
  );
});

test("renders the three highlighted products as text-only accents", () => {
  assert.equal(
    compactTradeAccent("gold"),
    "border-transparent bg-transparent text-[#22BBFF]",
  );
  assert.equal(
    compactFactoryAccent("gold"),
    "border-transparent bg-transparent text-[#FFD800]",
  );
  assert.equal(
    compactFactoryAccent("battle_record"),
    "border-transparent bg-transparent text-[#1F7DCE]",
  );
});

test("preserves every other compact product treatment", () => {
  assert.equal(
    compactTradeAccent("originium"),
    "border-transparent bg-[#8F1E26] text-white",
  );
  assert.equal(
    compactFactoryAccent("all"),
    "border-transparent bg-[#FFD800] text-[#313131]",
  );
  assert.equal(
    compactFactoryAccent("originium"),
    "border-transparent bg-[#8F1E26] text-white",
  );
  assert.equal(
    compactFactoryAccent("unknown"),
    "border-white/20 text-white bg-[#3C3C3C]/70",
  );
});
