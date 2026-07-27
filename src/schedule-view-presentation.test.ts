import assert from "node:assert/strict";
import test from "node:test";

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
    "[--operator-slot-size:clamp(56px,5.3vw,68px)]",
  );
  assert.equal(
    COMPACT_OPERATOR_ROW_CLASS,
    "flex items-start justify-start gap-2",
  );
});

test("pins every compact room title to the shared top position", () => {
  assert.equal(
    COMPACT_CARD_CLASS,
    "flex flex-col justify-start gap-2 bg-[#313131] px-3 py-2",
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
