import assert from "node:assert/strict";
import test from "node:test";

import { decryptOperboxSnapshot, encryptOperboxSnapshot } from "./workspace-crypto.ts";

const key = Buffer.alloc(32, 7);
const keys = new Map([["v1", key]]);

test("operbox envelope round-trips and binds ciphertext to user, record and schema", () => {
  const envelope = encryptOperboxSnapshot({
    userId: "user-a",
    snapshotId: "snapshot-a",
    plaintext: '[{"id":"char_1"}]',
    activeVersion: "v1",
    masterKey: key,
  });
  assert.equal(decryptOperboxSnapshot({ userId: "user-a", snapshotId: "snapshot-a", envelope, keys }), '[{"id":"char_1"}]');
  assert.throws(() => decryptOperboxSnapshot({ userId: "user-b", snapshotId: "snapshot-a", envelope, keys }));
  assert.throws(() => decryptOperboxSnapshot({ userId: "user-a", snapshotId: "snapshot-b", envelope, keys }));
  assert.throws(() => decryptOperboxSnapshot({ userId: "user-a", snapshotId: "snapshot-a", envelope: { ...envelope, schemaVersion: 2 }, keys }));
});

test("operbox envelope fails closed for tampering and missing key versions", () => {
  const envelope = encryptOperboxSnapshot({
    userId: "user-a",
    snapshotId: "snapshot-a",
    plaintext: "sensitive-box",
    activeVersion: "v1",
    masterKey: key,
  });
  const tampered = Buffer.from(envelope.encryptedPayload, "base64");
  tampered[0] ^= 1;
  assert.throws(() => decryptOperboxSnapshot({
    userId: "user-a",
    snapshotId: "snapshot-a",
    envelope: { ...envelope, encryptedPayload: tampered.toString("base64") },
    keys,
  }));
  assert.throws(() => decryptOperboxSnapshot({ userId: "user-a", snapshotId: "snapshot-a", envelope, keys: new Map() }));
});

test("operbox content HMAC cannot correlate equal boxes across website users", () => {
  const first = encryptOperboxSnapshot({
    userId: "user-a",
    snapshotId: "snapshot-a",
    plaintext: "same-box",
    activeVersion: "v1",
    masterKey: key,
  });
  const second = encryptOperboxSnapshot({
    userId: "user-b",
    snapshotId: "snapshot-b",
    plaintext: "same-box",
    activeVersion: "v1",
    masterKey: key,
  });
  assert.notEqual(first.contentHmac, second.contentHmac);
});
