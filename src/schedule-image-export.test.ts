import assert from "node:assert/strict";
import test from "node:test";

import { scheduleImageFileName, scheduleImagePixelRatio, scheduleImageWidth } from "./schedule-image-export.ts";

test("schedule image filename is safe on Windows", () => {
  assert.equal(scheduleImageFileName("243 / 高配", "第 1 班"), "243-高配-第-1-班.png");
  assert.equal(scheduleImageFileName("  ", "<>"), "基建排班-当前班次.png");
});

test("schedule image width follows current board within safe bounds", () => {
  assert.equal(scheduleImageWidth(280.2), 320);
  assert.equal(scheduleImageWidth(389.2), 390);
  assert.equal(scheduleImageWidth(1440), 1280);
});

test("schedule image pixel ratio stays below browser canvas limits", () => {
  assert.equal(scheduleImagePixelRatio(1200, 2000), 2);
  assert.ok(scheduleImagePixelRatio(1200, 12000) < 1.4);
  assert.ok(scheduleImagePixelRatio(1200, 30000) >= 0.5);
});
