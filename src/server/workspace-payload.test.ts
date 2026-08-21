import assert from "node:assert/strict";
import test from "node:test";

import { validateWorkspacePutRequest } from "./workspace-payload.ts";

function state(boxSource: "maa" | "sample" | "skland" = "maa") {
  return {
    presetLabel: "243",
    layout: {
      template: "243",
      drone_cap: 235,
      scenario: { sui_facility_count: 2, injected: { token: "secret" } },
      rooms: [
        { id: "control", kind: "control_center", level: 5, command: "private" },
        { id: "power", kind: "power_plant", level: 3 },
      ],
      stdout: "private",
    },
    sourceName: boxSource === "skland" ? "第三方昵称" : "box.json",
    boxSource,
    layoutDirty: false,
    layoutSource: boxSource === "skland" ? "skland" : "local",
    localLayoutBackup: null,
    rotationProfile: "abc_12_6_6",
    fiammettaEnabled: false,
    activeShift: 0,
    credentials: "private",
  };
}

test("workspace payload reconstructs an exact state and layout whitelist", () => {
  const result = validateWorkspacePutRequest({
    state: state("maa"),
    operbox: [{ id: "char_1", name: "测试干员", elite: 2, level: 80, own: true, potential: 1, rarity: 6, token: "private" }],
    result: null,
    unknown: { box: "private" },
  });
  assert.ok("state" in result);
  assert.deepEqual(Object.keys(result.state).sort(), [
    "activeShift",
    "boxSource",
    "fiammettaEnabled",
    "layout",
    "layoutDirty",
    "layoutSource",
    "localLayoutBackup",
    "presetLabel",
    "rotationProfile",
    "sourceName",
  ]);
  assert.equal(JSON.stringify(result).includes("private"), false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("Skland-derived identity, Box and plan data cannot enter a cloud payload", () => {
  const sanitized = validateWorkspacePutRequest({ state: state("skland"), operbox: null, result: { token: "private" } });
  assert.ok("state" in sanitized);
  assert.equal(sanitized.state.sourceName, null);
  assert.equal(sanitized.operbox, null);
  assert.equal(sanitized.result, null);
  assert.throws(() => validateWorkspacePutRequest({
    state: state("skland"),
    operbox: [{ id: "char_1" }],
    result: null,
  }));
});
