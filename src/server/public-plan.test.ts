import assert from "node:assert/strict";
import test from "node:test";

import type { PlanApiResponse } from "../types.ts";
import { safeDisplayName, toPublicPlanData } from "./public-plan.ts";

function internalResult(): PlanApiResponse {
  return {
    success: true,
    durationMs: 42,
    runId: "diagnostic-1",
    cliPath: "C:\\secret\\infra-cli.exe",
    command: "infra-cli serve",
    stdout: "secret stdout",
    stderr: "secret stderr",
    profileJson: {
      schema_version: 4,
      layout_label: "C:\\private\\243",
      operbox_label: "/private/box.json",
      baseline_label: "internal baseline",
      summary: { owned: 1, tier_up_owned: 1, trade_pool_ready: 1 },
      domains: [],
      rotation: {},
      baseline_rotation: {},
      actions: [],
      flags: [],
      narration_hints: [],
    },
    maaJson: { title: "C:\\private\\title", plans: [] },
    rotationJson: { shifts: [], daily: { trade: null, manu: null, power: null } },
    debugBundle: {
      version: "test",
      startedAt: "2026-07-28T00:00:00.000Z",
      durationMs: 42,
      cliPath: "C:\\secret\\infra-cli.exe",
      command: "infra-cli serve",
      exitCode: 0,
      signal: null,
      inputSummary: { layoutRooms: 1, operboxCount: 1, sourceName: "secret" },
      layout: { template: "243", drone_cap: 0, scenario: {}, rooms: [] },
      operbox: [],
      stdout: "secret",
      stderr: "",
      serveRequest: { method: "plan.compute" },
      serveResponse: { ok: true },
    },
  };
}

function keysDeep(value: unknown, result = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value)) {
    result.add(key);
    keysDeep(child, result);
  }
  return result;
}

test("production public plan data recursively excludes internal fields", () => {
  const previous = process.env.BETA_DEBUG_TOOLS_ENABLED;
  delete process.env.BETA_DEBUG_TOOLS_ENABLED;
  try {
    const publicData = toPublicPlanData(
      internalResult(),
      { layoutLabel: "C:\\private\\243", sourceName: "/private/box.json" },
      "request"
    );
    const keys = keysDeep(publicData);
    for (const forbidden of [
      "cliPath",
      "command",
      "stdout",
      "stderr",
      "debugBundle",
      "serveRequest",
      "serveResponse",
      "runPath",
      "resultPath",
    ]) {
      assert.equal(keys.has(forbidden), false, `must not expose ${forbidden}`);
    }
    assert.equal(publicData.diagnosticId, "diagnostic-1");
    assert.equal(publicData.profile.baseline_label, "产品推荐基准");
    assert.equal(publicData.profile.layout_label.includes("\\"), false);
    assert.equal(publicData.maa.title.includes("\\"), false);
  } finally {
    if (previous === undefined) delete process.env.BETA_DEBUG_TOOLS_ENABLED;
    else process.env.BETA_DEBUG_TOOLS_ENABLED = previous;
  }
});

test("debug fields require the server environment switch", () => {
  const previous = process.env.BETA_DEBUG_TOOLS_ENABLED;
  process.env.BETA_DEBUG_TOOLS_ENABLED = "1";
  try {
    const data = toPublicPlanData(internalResult(), { layoutLabel: "243", sourceName: "示例" }, "request");
    assert.equal(data.debug?.command, "infra-cli serve");
    assert.equal(data.debug?.stdout, "secret stdout");
  } finally {
    if (previous === undefined) delete process.env.BETA_DEBUG_TOOLS_ENABLED;
    else process.env.BETA_DEBUG_TOOLS_ENABLED = previous;
  }
});

test("safe display names remove path separators and control characters", () => {
  assert.equal(safeDisplayName(" C:\\private/\u0007name ", "fallback"), "C: private name");
});
