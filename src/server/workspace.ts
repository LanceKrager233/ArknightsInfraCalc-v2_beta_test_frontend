import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { PRIVACY_VERSION, TERMS_VERSION } from "@/legal-policy";
import { assertOperbox } from "@/operbox";
import { normalizePersistedPlanData } from "@/persistence";
import type {
  CloudWorkspaceData,
  CloudWorkspaceState,
  OperBoxEntry,
  PublicPlanData,
  SavedPlanData,
  SavedPlanListData,
} from "@/types";
import { PublicApiError } from "./api-contract";
import {
  BUSINESS_DATA_TTL_MS,
  SAVED_PLAN_LIMIT,
  WORKSPACE_REVISION_LIMIT,
  workspaceMasterKeys,
} from "./business-config";
import { requireAccountDataConsent } from "./data-consent";
import { getDatabase } from "./db";
import {
  operboxSnapshot,
  policyConsent,
  savedPlan,
  userWorkspace,
  workspaceRevision,
} from "./db/schema";
import {
  decryptOperboxSnapshot,
  encryptOperboxSnapshot,
  type OperboxEnvelope,
} from "./workspace-crypto";
import { evictUserPlanCaches } from "./plan-cache";
import {
  validateWorkspacePutRequest,
  validateWorkspaceState,
  type ValidatedWorkspace,
} from "./workspace-payload";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function snapshotEnvelope(row: typeof operboxSnapshot.$inferSelect): OperboxEnvelope {
  return {
    contentHmac: row.contentHmac,
    encryptedPayload: row.encryptedPayload,
    payloadIv: row.payloadIv,
    wrappedDataKey: row.wrappedDataKey,
    wrappedKeyIv: row.wrappedKeyIv,
    keyVersion: row.keyVersion,
    schemaVersion: row.schemaVersion,
  };
}

async function decryptSnapshot(userId: string, snapshotId: string | null): Promise<OperBoxEntry[] | null> {
  if (!snapshotId) return null;
  const [row] = await getDatabase().select().from(operboxSnapshot).where(and(
    eq(operboxSnapshot.id, snapshotId),
    eq(operboxSnapshot.userId, userId),
  )).limit(1);
  if (!row) throw new PublicApiError("AIC-DATA-8004");
  const keyring = workspaceMasterKeys();
  let plaintext: string;
  try {
    plaintext = decryptOperboxSnapshot({ userId, snapshotId, envelope: snapshotEnvelope(row), keys: keyring.keys });
  } catch (cause) {
    throw new PublicApiError("AIC-SYS-5000", { cause });
  }
  let parsed: unknown;
  try { parsed = JSON.parse(plaintext) as unknown; } catch (cause) { throw new PublicApiError("AIC-SYS-5000", { cause }); }
  let operbox: OperBoxEntry[];
  try { operbox = assertOperbox(parsed); } catch (cause) { throw new PublicApiError("AIC-SYS-5000", { cause }); }

  if (row.keyVersion !== keyring.activeVersion) {
    const activeKey = keyring.keys.get(keyring.activeVersion)!;
    const rotated = encryptOperboxSnapshot({
      userId,
      snapshotId,
      plaintext: JSON.stringify(operbox),
      activeVersion: keyring.activeVersion,
      masterKey: activeKey,
    });
    await getDatabase().update(operboxSnapshot).set({
      ...rotated,
      // Keep the stable deduplication token so key rotation cannot collide with
      // a concurrently uploaded copy encrypted under the new master key.
      contentHmac: row.contentHmac,
    }).where(eq(operboxSnapshot.id, snapshotId));
  }
  return operbox;
}

async function storeSnapshot(userId: string, operbox: OperBoxEntry[] | null, now: Date): Promise<string | null> {
  if (!operbox) return null;
  const snapshotId = randomUUID();
  const keyring = workspaceMasterKeys();
  const envelope = encryptOperboxSnapshot({
    userId,
    snapshotId,
    plaintext: JSON.stringify(operbox),
    activeVersion: keyring.activeVersion,
    masterKey: keyring.keys.get(keyring.activeVersion)!,
  });
  const inserted = await getDatabase().insert(operboxSnapshot).values({
    id: snapshotId,
    userId,
    sourceType: "maa",
    ...envelope,
    createdAt: now,
    expiresAt: new Date(now.getTime() + BUSINESS_DATA_TTL_MS),
  }).onConflictDoNothing({ target: [operboxSnapshot.userId, operboxSnapshot.contentHmac] }).returning({ id: operboxSnapshot.id });
  if (inserted[0]) return inserted[0].id;
  const [existing] = await getDatabase().select({ id: operboxSnapshot.id }).from(operboxSnapshot).where(and(
    eq(operboxSnapshot.userId, userId),
    eq(operboxSnapshot.contentHmac, envelope.contentHmac),
  )).limit(1);
  if (!existing) throw new PublicApiError("AIC-SYS-5000");
  await getDatabase().update(operboxSnapshot).set({ expiresAt: new Date(now.getTime() + BUSINESS_DATA_TTL_MS) }).where(eq(operboxSnapshot.id, existing.id));
  return existing.id;
}

function planTitle(state: CloudWorkspaceState): string {
  return `${state.presetLabel || state.layout.template} · ${state.sourceName || "排班"}`.slice(0, 120);
}

async function storeSavedPlan(userId: string, state: CloudWorkspaceState, result: PublicPlanData | null, now: Date): Promise<string | null> {
  if (!result) return null;
  const normalized = normalizePersistedPlanData(result, state.rotationProfile);
  if (!normalized) throw new PublicApiError("AIC-DATA-8003");
  const id = randomUUID();
  const inserted = await getDatabase().insert(savedPlan).values({
    id,
    userId,
    diagnosticId: normalized.diagnosticId,
    title: planTitle(state),
    publicResult: normalized,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + BUSINESS_DATA_TTL_MS),
  }).onConflictDoNothing({ target: [savedPlan.userId, savedPlan.diagnosticId] }).returning({ id: savedPlan.id });
  if (inserted[0]) return inserted[0].id;
  const [existing] = await getDatabase().select({ id: savedPlan.id, pinned: savedPlan.pinned }).from(savedPlan).where(and(
    eq(savedPlan.userId, userId),
    eq(savedPlan.diagnosticId, normalized.diagnosticId),
  )).limit(1);
  if (!existing) throw new PublicApiError("AIC-SYS-5000");
  await getDatabase().update(savedPlan).set({
    title: planTitle(state),
    publicResult: normalized,
    updatedAt: now,
    expiresAt: existing.pinned ? null : new Date(now.getTime() + BUSINESS_DATA_TTL_MS),
  }).where(eq(savedPlan.id, existing.id));
  return existing.id;
}

async function pruneUserHistory(userId: string, now: Date): Promise<void> {
  await getDatabase().delete(workspaceRevision).where(lt(workspaceRevision.expiresAt, now));
  const revisions = await getDatabase().select({ id: workspaceRevision.id }).from(workspaceRevision)
    .where(eq(workspaceRevision.userId, userId)).orderBy(desc(workspaceRevision.revision));
  if (revisions.length > WORKSPACE_REVISION_LIMIT) {
    await getDatabase().delete(workspaceRevision).where(inArray(workspaceRevision.id, revisions.slice(WORKSPACE_REVISION_LIMIT).map((item) => item.id)));
  }
  await getDatabase().delete(savedPlan).where(and(
    eq(savedPlan.userId, userId),
    eq(savedPlan.pinned, false),
    lt(savedPlan.expiresAt, now),
  ));
  const normalPlans = await getDatabase().select({ id: savedPlan.id }).from(savedPlan).where(and(
    eq(savedPlan.userId, userId), eq(savedPlan.pinned, false),
  )).orderBy(desc(savedPlan.updatedAt));
  if (normalPlans.length > SAVED_PLAN_LIMIT) {
    await getDatabase().delete(savedPlan).where(inArray(savedPlan.id, normalPlans.slice(SAVED_PLAN_LIMIT).map((item) => item.id)));
  }
  await getDatabase().delete(operboxSnapshot).where(and(
    eq(operboxSnapshot.userId, userId),
    lt(operboxSnapshot.expiresAt, now),
  ));
}

async function savedPlanResult(userId: string, id: string | null): Promise<PublicPlanData | null> {
  if (!id) return null;
  const [row] = await getDatabase().select({ result: savedPlan.publicResult }).from(savedPlan).where(and(
    eq(savedPlan.id, id), eq(savedPlan.userId, userId),
  )).limit(1);
  return row ? normalizePersistedPlanData(row.result, "abc_12_6_6") : null;
}

async function putValidatedWorkspace(userId: string, value: ValidatedWorkspace): Promise<CloudWorkspaceData> {
  const now = new Date();
  const snapshotId = await storeSnapshot(userId, value.operbox, now);
  const savedPlanId = await storeSavedPlan(userId, value.state, value.result, now);
  await getDatabase().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [current] = await tx.select().from(userWorkspace).where(eq(userWorkspace.userId, userId)).limit(1);
    const revision = (current?.currentRevision ?? 0) + 1;
    if (current) {
      const revisionExpiresAt = new Date(now.getTime() + BUSINESS_DATA_TTL_MS);
      await tx.insert(workspaceRevision).values({
        id: randomUUID(),
        userId,
        revision: current.currentRevision,
        state: current.state,
        operboxSnapshotId: current.operboxSnapshotId,
        savedPlanId: current.currentSavedPlanId,
        createdAt: current.updatedAt,
        expiresAt: revisionExpiresAt,
      }).onConflictDoNothing({ target: [workspaceRevision.userId, workspaceRevision.revision] });
      if (current.operboxSnapshotId) {
        await tx.update(operboxSnapshot).set({ expiresAt: revisionExpiresAt }).where(eq(operboxSnapshot.id, current.operboxSnapshotId));
      }
      if (current.currentSavedPlanId) {
        await tx.update(savedPlan).set({ expiresAt: revisionExpiresAt }).where(and(
          eq(savedPlan.id, current.currentSavedPlanId),
          eq(savedPlan.pinned, false),
        ));
      }
      await tx.update(userWorkspace).set({
        currentRevision: revision,
        state: value.state,
        operboxSnapshotId: snapshotId,
        currentSavedPlanId: savedPlanId,
        updatedAt: now,
        syncedAt: now,
      }).where(eq(userWorkspace.userId, userId));
    } else {
      await tx.insert(userWorkspace).values({
        userId,
        currentRevision: revision,
        state: value.state,
        operboxSnapshotId: snapshotId,
        currentSavedPlanId: savedPlanId,
        createdAt: now,
        updatedAt: now,
        syncedAt: now,
      });
    }
  });
  await pruneUserHistory(userId, now);
  return getWorkspace(userId);
}

export async function getWorkspace(userId: string): Promise<CloudWorkspaceData> {
  await requireAccountDataConsent(userId);
  const [current] = await getDatabase().select().from(userWorkspace).where(eq(userWorkspace.userId, userId)).limit(1);
  const revisions = await getDatabase().select({
    id: workspaceRevision.id,
    revision: workspaceRevision.revision,
    createdAt: workspaceRevision.createdAt,
    expiresAt: workspaceRevision.expiresAt,
  }).from(workspaceRevision).where(eq(workspaceRevision.userId, userId)).orderBy(desc(workspaceRevision.revision)).limit(WORKSPACE_REVISION_LIMIT);
  if (!current) {
    return { exists: false, revision: 0, state: null, operbox: null, result: null, updatedAt: null, syncedAt: null, revisions: [] };
  }
  const syncedAt = new Date();
  const activeExpiresAt = new Date(syncedAt.getTime() + BUSINESS_DATA_TTL_MS);
  await getDatabase().transaction(async (tx) => {
    await tx.update(userWorkspace).set({ syncedAt }).where(eq(userWorkspace.userId, userId));
    if (current.operboxSnapshotId) {
      await tx.update(operboxSnapshot).set({ expiresAt: activeExpiresAt }).where(eq(operboxSnapshot.id, current.operboxSnapshotId));
    }
    if (current.currentSavedPlanId) {
      await tx.update(savedPlan).set({ expiresAt: activeExpiresAt }).where(and(
        eq(savedPlan.id, current.currentSavedPlanId),
        eq(savedPlan.pinned, false),
      ));
    }
  });
  const state = validateWorkspaceState(current.state);
  return {
    exists: true,
    revision: current.currentRevision,
    state,
    operbox: state.boxSource === "maa" ? await decryptSnapshot(userId, current.operboxSnapshotId) : null,
    result: await savedPlanResult(userId, current.currentSavedPlanId),
    updatedAt: current.updatedAt.toISOString(),
    syncedAt: syncedAt.toISOString(),
    revisions: revisions.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), expiresAt: item.expiresAt.toISOString() })),
  };
}

export async function putWorkspace(userId: string, body: unknown): Promise<CloudWorkspaceData> {
  await requireAccountDataConsent(userId);
  const request = validateWorkspacePutRequest(body);
  if ("restoreRevisionId" in request) {
    const [revision] = await getDatabase().select().from(workspaceRevision).where(and(
      eq(workspaceRevision.id, request.restoreRevisionId),
      eq(workspaceRevision.userId, userId),
    )).limit(1);
    if (!revision || revision.expiresAt <= new Date()) throw new PublicApiError("AIC-DATA-8004");
    const state = validateWorkspaceState(revision.state);
    return putValidatedWorkspace(userId, {
      state,
      operbox: state.boxSource === "maa" ? await decryptSnapshot(userId, revision.operboxSnapshotId) : null,
      result: await savedPlanResult(userId, revision.savedPlanId),
    });
  }
  return putValidatedWorkspace(userId, request);
}

function toSavedPlanData(row: typeof savedPlan.$inferSelect): SavedPlanData | null {
  const result = normalizePersistedPlanData(row.publicResult, "abc_12_6_6");
  if (!result) return null;
  return {
    id: row.id,
    diagnosticId: row.diagnosticId,
    title: row.title,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    result,
  };
}

export async function listSavedPlans(userId: string): Promise<SavedPlanListData> {
  await requireAccountDataConsent(userId);
  await pruneUserHistory(userId, new Date());
  const rows = await getDatabase().select().from(savedPlan).where(eq(savedPlan.userId, userId)).orderBy(desc(savedPlan.pinned), desc(savedPlan.updatedAt));
  return { plans: rows.map(toSavedPlanData).filter((item): item is SavedPlanData => item !== null) };
}

export async function updateSavedPlan(userId: string, id: string, value: unknown): Promise<SavedPlanData> {
  await requireAccountDataConsent(userId);
  if (!isObject(value) || typeof value.pinned !== "boolean") throw new PublicApiError("AIC-DATA-8003");
  const pinnedValue = value.pinned;
  return getDatabase().transaction(async (tx) => {
    // Serialize pin-count checks per account so concurrent devices cannot exceed
    // the five long-lived plans limit.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [existing] = await tx.select().from(savedPlan).where(and(
      eq(savedPlan.id, id),
      eq(savedPlan.userId, userId),
    )).limit(1);
    if (!existing) throw new PublicApiError("AIC-DATA-8004");
    if (pinnedValue && !existing.pinned) {
      const pinned = await tx.select({ count: sql<number>`count(*)::int` }).from(savedPlan).where(and(
        eq(savedPlan.userId, userId),
        eq(savedPlan.pinned, true),
      ));
      if ((pinned[0]?.count ?? 0) >= SAVED_PLAN_LIMIT) {
        throw new PublicApiError("AIC-DATA-8003", { message: "最多固定 5 条排班。" });
      }
    }
    const [updated] = await tx.update(savedPlan).set({
      pinned: pinnedValue,
      expiresAt: pinnedValue ? null : new Date(Date.now() + BUSINESS_DATA_TTL_MS),
      updatedAt: new Date(),
    }).where(and(eq(savedPlan.id, id), eq(savedPlan.userId, userId))).returning();
    const result = updated && toSavedPlanData(updated);
    if (!result) throw new PublicApiError("AIC-DATA-8004");
    return result;
  });
}

export async function deleteSavedPlan(userId: string, id: string): Promise<void> {
  await requireAccountDataConsent(userId);
  const deleted = await getDatabase().delete(savedPlan).where(and(eq(savedPlan.id, id), eq(savedPlan.userId, userId))).returning({ id: savedPlan.id });
  if (!deleted.length) throw new PublicApiError("AIC-DATA-8004");
}

export async function revokeAccountDataAndDeleteWorkspace(userId: string): Promise<void> {
  await requireAccountDataConsent(userId);
  await evictUserPlanCaches(userId);
  await getDatabase().transaction(async (tx) => {
    await tx.delete(workspaceRevision).where(eq(workspaceRevision.userId, userId));
    await tx.delete(userWorkspace).where(eq(userWorkspace.userId, userId));
    await tx.delete(savedPlan).where(eq(savedPlan.userId, userId));
    await tx.delete(operboxSnapshot).where(eq(operboxSnapshot.userId, userId));
    await tx.update(policyConsent).set({ revokedAt: new Date() }).where(and(
      eq(policyConsent.userId, userId),
      eq(policyConsent.termsVersion, TERMS_VERSION),
      eq(policyConsent.privacyVersion, PRIVACY_VERSION),
    ));
  });
}
