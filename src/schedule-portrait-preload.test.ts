import assert from "node:assert/strict";
import test from "node:test";

import { clearOperatorPortraitCache, OPERATOR_PORTRAIT_CACHE, preloadWithConcurrency, scheduleOperatorNames } from "./schedule-portrait-preload.ts";

test("collects unique operators from every shift and Fiammetta targets", () => {
  const names = scheduleOperatorNames({ title: "test", plans: [
    { name: "1", rooms: { trading: [{ operators: ["能天使", { name: "德克萨斯" }, null] }] }, Fiammetta: { enable: true, target: "菲亚梅塔" } },
    { name: "2", rooms: { manufacture: [{ operators: ["能天使", "白面鸮"] }] } },
  ] });
  assert.deepEqual(names, ["能天使", "德克萨斯", "菲亚梅塔", "白面鸮"]);
});

test("preloads with bounded concurrency and ignores individual failures", async () => {
  let active = 0;
  let peak = 0;
  const loaded: number[] = [];
  await preloadWithConcurrency([1, 2, 3, 4, 5], async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    if (item === 3) throw new Error("failed");
    loaded.push(item);
  }, 2);
  assert.equal(peak, 2);
  assert.deepEqual(loaded.sort(), [1, 2, 4, 5]);
});

test("clears only the managed operator portrait cache", async () => {
  const deleted: string[] = [];
  const supported = await clearOperatorPortraitCache({
    delete: async (name) => {
      deleted.push(name);
      return true;
    },
  });
  assert.equal(supported, true);
  assert.deepEqual(deleted, [OPERATOR_PORTRAIT_CACHE]);
});
