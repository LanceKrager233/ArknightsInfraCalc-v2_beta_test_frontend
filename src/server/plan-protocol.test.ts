import assert from "node:assert/strict";
import test from "node:test";

import {
  assertUniqueOperboxIdentities,
  createSolverObservation,
  inspectPlanComputeCapability,
  inspectSolverDeploymentReadiness,
  parsePlanComputePayload,
  solverObservationFromPlanRecord,
} from "./plan-protocol.ts";

test("uses plan.compute for matching versions regardless of schema byte hash", () => {
  const contractHashes = [
    { label: "LF schema bytes", value: "60acbcf154da1f099f717a2952b6aa3d101bca1e7a1c3e237b0c81d9967eb9b6" },
    { label: "CRLF schema bytes", value: "52b78160b7f3290c6939807af5b7d6d31ee8322ea68de9288773eebca32d5102" },
    { label: "missing schema fingerprint", value: undefined },
  ];
  for (const { label, value: planContractSha256 } of contractHashes) {
    const capability = inspectPlanComputeCapability({
      ok: true,
      result: {
        pong: true,
        protocol_version: 1,
        plan_schema_version: 1,
        supported_plan_schema_versions: [1, 2],
        plan_contract_sha256: planContractSha256,
      },
    });

    assert.equal(capability.supported, true, label);
    assert.equal(capability.reason, null);
    assert.equal(capability.contractSha256, planContractSha256 ?? null);
  }
});

test("keeps a legacy worker on the legacy plan method", () => {
  const capability = inspectPlanComputeCapability({ ok: true, result: { pong: true } });

  assert.equal(capability.supported, false);
  assert.match(capability.reason ?? "", /protocol_version/);
});

test("keeps incompatible protocol or schema versions on the legacy plan method", () => {
  const protocolMismatch = inspectPlanComputeCapability({
    ok: true,
    result: {
      protocol_version: 2,
      plan_schema_version: 1,
    },
  });
  const schemaMismatch = inspectPlanComputeCapability({
    ok: true,
    result: {
      protocol_version: 1,
      plan_schema_version: 1,
      supported_plan_schema_versions: [1],
    },
  });

  assert.equal(protocolMismatch.supported, false);
  assert.match(protocolMismatch.reason ?? "", /protocol_version/);
  assert.equal(schemaMismatch.supported, false);
  assert.match(schemaMismatch.reason ?? "", /plan_schema_version/);
});

test("normalizes Worker fingerprints and keeps them diagnostic-only", () => {
  const executableHash = "a".repeat(64);
  const capability = inspectPlanComputeCapability({
    ok: true,
    result: {
      protocol_version: 1,
      plan_schema_version: 1,
      supported_plan_schema_versions: [1, 2],
      plan_contract_sha256: "not-a-hash",
      solver_executable_sha256: executableHash,
    },
  });

  assert.equal(capability.supported, true);
  assert.equal(capability.contractSha256, null);
  assert.equal(capability.solverExecutableSha256, executableHash);

  for (const invalidFingerprint of ["A".repeat(64), "", "not-a-hash", null]) {
    const invalid = inspectPlanComputeCapability({
      ok: true,
      result: {
        protocol_version: 1,
        plan_schema_version: 1,
        supported_plan_schema_versions: [1, 2],
        solver_executable_sha256: invalidFingerprint,
      },
    });
    assert.equal(invalid.supported, true);
    assert.equal(invalid.solverExecutableSha256, null);
  }
});

test("deployment readiness requires current versions and the configured artifact fingerprint", () => {
  const executableHash = "b".repeat(64);
  const capability = inspectPlanComputeCapability({
    ok: true,
    result: {
      protocol_version: 1,
      plan_schema_version: 1,
      supported_plan_schema_versions: [1, 2],
      solver_executable_sha256: executableHash,
    },
  });

  assert.deepEqual(inspectSolverDeploymentReadiness(capability, undefined), { ready: true, reason: null });
  assert.deepEqual(inspectSolverDeploymentReadiness(capability, executableHash), { ready: true, reason: null });
  assert.equal(inspectSolverDeploymentReadiness(capability, "c".repeat(64)).ready, false);
  assert.equal(inspectSolverDeploymentReadiness(capability, "invalid").ready, false);

  const legacy = inspectPlanComputeCapability({ ok: true, result: { pong: true } });
  assert.deepEqual(inspectSolverDeploymentReadiness(legacy, undefined), { ready: true, reason: null });
  assert.equal(inspectSolverDeploymentReadiness(legacy, executableHash).ready, false);
});

test("feedback metadata reuses the matching private run observation and tolerates old records", () => {
  const capability = inspectPlanComputeCapability({
    ok: true,
    result: {
      protocol_version: 1,
      plan_schema_version: 1,
      supported_plan_schema_versions: [1, 2],
      plan_contract_sha256: "d".repeat(64),
      solver_executable_sha256: "e".repeat(64),
    },
  });
  const observation = createSolverObservation(capability, "2026-08-13T01:02:03.000Z");
  const feedbackMeta = {
    solver: solverObservationFromPlanRecord({ solver: observation }),
  };
  const legacyFeedbackMeta = {
    solver: solverObservationFromPlanRecord({ success: true }),
  };

  assert.deepEqual(feedbackMeta.solver, observation);
  assert.equal(legacyFeedbackMeta.solver, null);
  assert.equal(solverObservationFromPlanRecord(null), null);
});

test("validates the complete plan.compute success payload", () => {
  const payload = parsePlanComputePayload({
    ok: true,
    result: {
      schema_version: 2,
      profile: { schema_version: 4 },
      rotation: { profile: "abc_12_6_6", daily: {}, shifts: [] },
      maa: { plans: [] },
    },
  });

  assert.deepEqual(payload?.rotation.shifts, []);
  assert.equal(payload?.profile.schema_version, 4);
});

test("rejects malformed successful plan.compute payloads", () => {
  assert.throws(
    () => parsePlanComputePayload({ ok: true, result: { schema_version: 2, profile: {}, rotation: { shifts: [] } } }),
    /maa/
  );
});

test("rejects duplicate operbox names without rewriting them", () => {
  const entries = [
    { id: "char_1", name: "阿米娅", elite: 2, level: 80, own: true, potential: 6, rarity: 5 },
    { id: "char_2", name: "阿米娅", elite: 2, level: 80, own: true, potential: 6, rarity: 5 },
  ];

  assert.throws(() => assertUniqueOperboxIdentities(entries), /干员名称重复：阿米娅/);
  assert.equal(entries[1].name, "阿米娅");
});
