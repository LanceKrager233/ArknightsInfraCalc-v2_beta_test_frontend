import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process, { stdout } from "node:process";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";

const EXPECTED_PROTOCOL_VERSION = 1;
const EXPECTED_PLAN_SCHEMA_VERSION = 1;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const binaryPath = path.join(repoRoot, "bin", "infra-cli");
const layoutPath = path.join(repoRoot, "src", "layouts", "243.json");
const operboxPath = path.join(repoRoot, "fixtures", "operbox_full_e2.json");

if (process.platform !== "linux") {
  throw new Error("The bundled solver contract smoke test must run on Linux.");
}

const binary = await readFile(binaryPath);
assert.equal(binary.subarray(0, 4).toString("hex"), "7f454c46", "bin/infra-cli must be ELF");
assert.equal(binary[4], 2, "bin/infra-cli must be a 64-bit ELF executable");
assert.equal(binary[5], 1, "bin/infra-cli must be little-endian");
assert.equal(binary.readUInt16LE(18), 62, "bin/infra-cli must target x86-64");
await access(binaryPath, constants.X_OK);

const artifactSha256 = createHash("sha256").update(binary).digest("hex");
const smokeRoot = await mkdtemp(path.join(tmpdir(), "arkinfra-solver-smoke-"));
let worker;
let closing = false;
let stderrText = "";

function withStderr(error) {
  if (!stderrText.trim()) return error;
  return new Error(`${error.message}\ninfra-cli stderr:\n${stderrText.trim()}`, { cause: error });
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`infra-cli did not exit within ${timeoutMs}ms`));
    }, timeoutMs);
    const onExit = (code, signal) => {
      cleanup();
      resolve({ code, signal });
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function stopWorker() {
  if (!worker || worker.exitCode !== null || worker.signalCode !== null) return;
  closing = true;
  worker.stdin.end();
  try {
    await waitForExit(worker, 5_000);
    return;
  } catch {
    worker.kill("SIGTERM");
  }
  try {
    await waitForExit(worker, 3_000);
  } catch {
    worker.kill("SIGKILL");
    await waitForExit(worker, 3_000).catch(() => undefined);
  }
}

try {
  const workerEnv = { ...process.env, TMPDIR: smokeRoot };
  delete workerEnv.ARKNIGHTS_INFRA_DATA_DIR;
  worker = spawn(binaryPath, ["serve"], {
    cwd: smokeRoot,
    env: workerEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });
  worker.stderr.setEncoding("utf8");
  worker.stderr.on("data", (chunk) => {
    stderrText = `${stderrText}${chunk}`.slice(-65_536);
  });

  const waiters = new Map();
  const lines = createInterface({ input: worker.stdout, crlfDelay: Number.POSITIVE_INFINITY });

  const failWaiters = (error) => {
    for (const waiter of waiters.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    waiters.clear();
  };

  lines.on("line", (line) => {
    if (!line.trim()) return;
    let response;
    try {
      response = JSON.parse(line);
    } catch (error) {
      failWaiters(new Error(`infra-cli emitted invalid JSON: ${line.slice(0, 500)}`, { cause: error }));
      return;
    }
    const waiter = waiters.get(response?.id);
    if (!waiter) {
      failWaiters(new Error(`infra-cli emitted an unexpected response id: ${String(response?.id)}`));
      return;
    }
    clearTimeout(waiter.timer);
    waiters.delete(response.id);
    waiter.resolve(response);
  });
  worker.once("error", failWaiters);
  worker.once("exit", (code, signal) => {
    if (!closing) {
      failWaiters(new Error(`infra-cli exited early (code=${String(code)}, signal=${String(signal)})`));
    }
  });

  const request = (frame, timeoutMs) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(frame.id);
        reject(new Error(`infra-cli request ${frame.id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      waiters.set(frame.id, { resolve, reject, timer });
      worker.stdin.write(`${JSON.stringify(frame)}\n`, (error) => {
        if (!error) return;
        clearTimeout(timer);
        waiters.delete(frame.id);
        reject(error);
      });
    });

  const ping = await request({ id: 1, method: "ping" }, 30_000);
  assert.equal(ping.ok, true, JSON.stringify(ping));
  assert.equal(ping.result?.protocol_version, EXPECTED_PROTOCOL_VERSION);
  assert.equal(ping.result?.plan_schema_version, EXPECTED_PLAN_SCHEMA_VERSION);
  assert.equal(ping.result?.solver_executable_sha256, artifactSha256);
  if (ping.result?.plan_contract_sha256 != null) {
    assert.match(ping.result.plan_contract_sha256, SHA256_PATTERN);
  }

  const [layout, operbox] = await Promise.all([
    readFile(layoutPath, "utf8").then(JSON.parse),
    readFile(operboxPath, "utf8").then(JSON.parse),
  ]);
  assert.equal(Array.isArray(operbox), true);
  assert.equal(operbox.length, 418);

  const plan = await request(
    {
      id: 2,
      method: "plan.compute",
      params: {
        schema_version: EXPECTED_PLAN_SCHEMA_VERSION,
        layout,
        operbox,
        labels: {
          layout: "frontend-ci-243",
          operbox: "frontend-full-e2",
        },
        options: {
          rotation: "abc_12_6_6",
          top: 20,
          system_preferences: {},
          maa_title: "Frontend solver contract smoke",
        },
      },
    },
    180_000
  );
  assert.equal(plan.ok, true, JSON.stringify(plan));
  assert.equal(plan.result?.schema_version, EXPECTED_PLAN_SCHEMA_VERSION);
  assert.ok(plan.result?.profile && typeof plan.result.profile === "object");
  assert.ok(plan.result?.maa && typeof plan.result.maa === "object");
  assert.equal(Array.isArray(plan.result?.rotation?.shifts), true);
  assert.equal(plan.result.rotation.shifts.length, 3);

  closing = true;
  worker.stdin.end();
  const exit = await waitForExit(worker, 10_000);
  assert.equal(exit.code, 0, `infra-cli exit signal: ${String(exit.signal)}`);

  stdout.write(
    `${JSON.stringify({
      artifactSha256,
      protocolVersion: ping.result.protocol_version,
      planSchemaVersion: ping.result.plan_schema_version,
      shiftCount: plan.result.rotation.shifts.length,
      operboxEntries: operbox.length,
    })}\n`
  );
} catch (error) {
  throw withStderr(error);
} finally {
  await stopWorker();
  await rm(smokeRoot, { recursive: true, force: true });
}
