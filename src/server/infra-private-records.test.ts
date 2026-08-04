import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  isLegacySklandRunDirectoryName,
  isPrivateStorageChild,
  isSafePrivateStorageRoot,
} from "./private-storage.ts";

test("private record deletion accepts only strict children of the configured root", () => {
  const root = path.resolve("private-record-test-root");
  assert.equal(isPrivateStorageChild(root, path.join(root, "run-1")), true);
  assert.equal(isPrivateStorageChild(root, path.join(root, "nested", "run-2")), true);
  assert.equal(isPrivateStorageChild(root, root), false);
  assert.equal(isPrivateStorageChild(root, path.dirname(root)), false);
  assert.equal(isPrivateStorageChild(root, path.resolve(`${root}-sibling`, "run-3")), false);
});

test("legacy migration recognizes both current and old identifying Skland run labels", () => {
  assert.equal(isLegacySklandRunDirectoryName("2026-08-05_森空岛同步_run-id"), true);
  assert.equal(isLegacySklandRunDirectoryName("2026-07-01_skland_123456789_1700000000_run-id"), true);
  assert.equal(isLegacySklandRunDirectoryName("2026-08-05_MAA导入_run-id"), false);
});

test("private record deletion refuses filesystem and explicitly disallowed broad roots", () => {
  const workspace = path.resolve("workspace-root");
  const storage = path.join(workspace, "server", "storage");
  assert.equal(isSafePrivateStorageRoot(path.parse(storage).root), false);
  assert.equal(isSafePrivateStorageRoot(workspace, [workspace]), false);
  assert.equal(isSafePrivateStorageRoot(path.dirname(workspace), [workspace]), false);
  assert.equal(isSafePrivateStorageRoot(storage, [workspace]), true);
});
