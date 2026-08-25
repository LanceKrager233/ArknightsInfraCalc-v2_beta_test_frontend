import assert from "node:assert/strict";
import test from "node:test";

import { estimateDroneYield } from "./drone-yield.ts";
import type { RoomRow } from "./schedule.ts";

const row = (overrides: Partial<RoomRow>): RoomRow => ({ key: "room", group: "trading", groupLabel: "贸易站", index: 0, roomId: "trade_1", title: "贸易站 1", level: 3, product: "龙门商法", operators: [], operatorSlots: [], autofill: false, efficiency: { final_efficiency: 2 }, rule: "", suspicious: false, ...overrides });

test("estimates three-minute drone acceleration from the current room efficiency", () => {
  assert.equal(Math.round(estimateDroneYield(row({}), 100)?.value ?? 0), 4_277);
  assert.deepEqual(estimateDroneYield(row({ group: "manufacture", product: "作战记录" }), 48), { value: 1600, unit: "经验", product: "作战记录" });
});
